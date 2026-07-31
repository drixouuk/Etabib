import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { runBillingCycle, type CmsApi } from '@/lib/billing-cycle'
import { sendEmail } from '@/lib/resend-send'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_CMS_URL
  if (!url) throw new Error('NEXT_PUBLIC_CMS_URL manquant')
  return url
}

// Appels CMS avec le token de session du superadmin
function cmsWithToken(token: string): CmsApi {
  return async (method, path, body) => {
    const res = await fetch(`${getCMSURL()}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  }
}

async function requireSuperadmin(): Promise<string | null> {
  const store = await cookies()
  const token = store.get('payload-token')?.value
  if (!token) return null
  const res = await fetch(`${getCMSURL()}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) return null
  const me = await res.json()
  return me?.user?.roles?.includes('superadmin') ? token : null
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Essai', active: 'Actif', past_due: 'En retard', grace: 'Lecture seule',
  suspended: 'Suspendu', expired: 'Expiré', canceled: 'Résilié',
}

export async function GET() {
  const token = await requireSuperadmin()
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const res = await fetch(
    `${getCMSURL()}/api/subscriptions?where[status][in]=trialing,past_due,grace,suspended,expired,canceled&depth=1&limit=200&sort=currentPeriodEnd`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
  )
  const data = await res.json().catch(() => null)
  type RawSub = {
    id: string
    tenant: { id: string; name?: string; domain?: string; email?: string } | string
    plan: string
    status: string
    currentPeriodEnd: string | null
    lastPaymentAt: string | null
    lastReminderAt: string | null
    seats: number | null
    amount: number | null
    billingEmail: string | null
    notes: string | null
  }
  const docs = (data?.docs ?? [] as RawSub[]).map((s: RawSub) => ({
    id: s.id,
    tenantId: String(typeof s.tenant === 'object' ? s.tenant.id : s.tenant),
    tenantName: (typeof s.tenant === 'object' && (s.tenant.name || s.tenant.domain)) || String(typeof s.tenant === 'object' ? s.tenant.id : s.tenant),
    domain: typeof s.tenant === 'object' ? s.tenant.domain || '' : '',
    plan: s.plan,
    status: s.status,
    statusLabel: STATUS_LABELS[s.status] || s.status,
    currentPeriodEnd: s.currentPeriodEnd,
    lastPaymentAt: s.lastPaymentAt,
    lastReminderAt: s.lastReminderAt,
    seats: s.seats,
    amount: s.amount,
    billingEmail: s.billingEmail,
    notes: s.notes,
  }))
  return NextResponse.json({ docs })
}

export async function POST(request: NextRequest) {
  const token = await requireSuperadmin()
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const cms = cmsWithToken(token)

  const { action, id, note } = await request.json().catch(() => ({}))

  if (action === 'run-cycle') {
    const result = await runBillingCycle(cms, { sendEmails: true })
    return NextResponse.json(result)
  }

  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const subRes = await cms('GET', `/api/subscriptions/${id}?depth=1`)
  if (!subRes.ok || !subRes.data) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 })
  const sub = subRes.data as {
    id: string
    tenant?: { id: string; email?: string; name?: string; domain?: string } | string
    plan: string
    status: string
    notes?: string | null
    billingEmail?: string | null
  }
  const tenantId = String(typeof sub.tenant === 'object' ? sub.tenant.id : sub.tenant)

  const now = new Date()
  const day = 86400000
  const stamp = `[${now.toISOString().slice(0, 10)}]`

  switch (action) {
    case 'mark-paid': {
      const body: Record<string, unknown> = {
        status: 'active',
        lastPaymentAt: now.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: new Date(now.getTime() + 30 * day).toISOString(),
        notes: `${sub.notes || ''}\n${stamp} Paiement confirmé${note ? ` — ${note}` : ''}`.trim(),
      }
      if (note) body.providerId = note
      await cms('PATCH', `/api/subscriptions/${id}`, body)
      // Restaure le tier fonctionnel si le tenant avait été downgradé
      const tenant = await cms('GET', `/api/tenants/${tenantId}?depth=0`)
      const tenantSettings = (tenant.data?.settings as { activeTier?: string } | undefined)
      if (tenant.ok && (tenantSettings?.activeTier || 'vitrine') !== sub.plan) {
        await cms('PATCH', `/api/tenants/${tenantId}`, {
          settings: { ...tenantSettings, activeTier: sub.plan },
        })
      }
      return NextResponse.json({ ok: true })
    }
    case 'suspend': {
      await cms('PATCH', `/api/subscriptions/${id}`, {
        status: 'suspended',
        notes: `${sub.notes || ''}\n${stamp} Suspension manuelle${note ? ` — ${note}` : ''}`.trim(),
      })
      return NextResponse.json({ ok: true })
    }
    case 'restore': {
      await cms('PATCH', `/api/subscriptions/${id}`, {
        status: 'active',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: new Date(now.getTime() + 30 * day).toISOString(),
        notes: `${sub.notes || ''}\n${stamp} Restauration${note ? ` — ${note}` : ''}`.trim(),
      })
      return NextResponse.json({ ok: true })
    }
    case 'remind': {
      await cms('PATCH', `/api/subscriptions/${id}`, { lastReminderAt: now.toISOString() })
      const to = sub.billingEmail || (typeof sub.tenant === 'object' ? sub.tenant.email || '' : '')
      if (to) {
        try {
          await sendEmail(
            to,
            'Rappel : régularisez votre abonnement Etabib',
            `<p>Bonjour,</p><p>Votre abonnement est en attente de régularisation.</p><p>Répondez à cet email ou contactez-nous pour organiser le paiement.</p>`,
          )
        } catch { /* email échoué — l'action reste loggée */ }
      }
      return NextResponse.json({ ok: true })
    }
    case 'note': {
      await cms('PATCH', `/api/subscriptions/${id}`, {
        notes: `${sub.notes || ''}\n${stamp} ${note || ''}`.trim(),
      })
      return NextResponse.json({ ok: true })
    }
    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }
}
