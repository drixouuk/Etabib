import { sendEmail } from '@/lib/resend-send'
import { computeAmount, PERIOD_DAYS, TRIAL_DAYS } from '@/lib/subscription'
import type { SubscriptionStatus } from '@/lib/subscription'

export type CmsApi = (
  method: string,
  path: string,
  body?: unknown,
) => Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }>

export type CycleOptions = {
  now?: Date
  sendEmails?: boolean
  // Hook infra (revalidation de cache) : appelé après chaque écriture réussie
  // d'un tenant (ensure + transitions + downgrade). La lib reste pure —
  // c'est la route appelante qui branche next/cache dessus.
  onTenantProcessed?: (tenantId: string) => void
}

export type CycleResult = {
  ensured: number
  transitions: { id: string; tenantId: string; from: string; to: string }[]
  emails: string[]
  errors: string[]
}

const DAY_MS = 86400000

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / DAY_MS
}

type RawSubscription = {
  id: string
  tenant?: { id: string; email?: string } | string
  plan: string
  status: string
  currentPeriodEnd?: string | null
  currentPeriodStart?: string | null
  lastPaymentAt?: string | null
  lastReminderAt?: string | null
  notes?: string | null
  billingEmail?: string | null
}

function appendNote(sub: RawSubscription, text: string): string {
  const prev = sub.notes || ''
  const stamp = new Date().toISOString().slice(0, 10)
  return `${prev ? `${prev}\n` : ''}[${stamp}] ${text}`
}

/**
 * Cycle de facturation quotidien.
 * 1. Ensure : crée la subscription manquante des tenants legacy (grandfathered :
 *    un mois de cycle avant la première facturation ; vitrine = actif sans cycle).
 * 2. Transitions : trialing→expired, active→past_due, past_due→grace (J+14),
 *    grace→suspended (J+30), suspended→expired (J+210), auto-restore si paiement
 *    marqué entre-temps.
 * 3. Relances email (past_due J+0 et J+7).
 * Les données de santé ne sont JAMAIS supprimées : expired = état terminal, accès coupé.
 */
export async function runBillingCycle(cms: CmsApi, options: CycleOptions = {}): Promise<CycleResult> {
  const now = options.now || new Date()
  const result: CycleResult = { ensured: 0, transitions: [], emails: [], errors: [] }

  const subsRes = await cms('GET', '/api/subscriptions?depth=1&limit=500')
  if (!subsRes.ok) {
    result.errors.push(`subscriptions fetch: ${subsRes.status}`)
    return result
  }
  const subs: RawSubscription[] = (subsRes.data?.docs as RawSubscription[] | undefined) ?? []
  const byTenant = new Map<string, RawSubscription>(subs.map((s) => [String((s.tenant as { id?: string } | undefined)?.id ?? s.tenant), s]))

  // --- 1. Ensure : tenants sans subscription ---
  const tenantsRes = await cms('GET', '/api/tenants?depth=0&limit=500')
  if (tenantsRes.ok) {
    type RawTenant = { id: string; settings?: { activeTier?: string; doctorCount?: number; billingEmail?: string } }
    const tenants = (tenantsRes.data?.docs as RawTenant[] | undefined) ?? []
    for (const tenant of tenants) {
      if (byTenant.has(String(tenant.id))) continue
      const tier = tenant.settings?.activeTier || 'vitrine'
      const body: Record<string, unknown> = {
        tenant: tenant.id,
        plan: tier,
        status: 'active',
        seats: tier === 'cabinet' ? (tenant.settings?.doctorCount || 1) : 1,
        amount: computeAmount(tier, tenant.settings?.doctorCount || 1),
        billingEmail: tenant.settings?.billingEmail || null,
      }
      if (tier !== 'vitrine') {
        body.currentPeriodStart = now.toISOString()
        body.currentPeriodEnd = new Date(now.getTime() + PERIOD_DAYS * DAY_MS).toISOString()
      }
      const created = await cms('POST', '/api/subscriptions', body)
      if (created.ok) {
        result.ensured++
        byTenant.set(String(tenant.id), created.data?.doc as RawSubscription)
        options.onTenantProcessed?.(String(tenant.id))
      } else {
        result.errors.push(`ensure sub tenant ${tenant.id}: ${created.status}`)
      }
    }
  }

  // --- 2. Transitions ---
  for (const sub of subs) {
    const tenantObj = typeof sub.tenant === 'object' ? sub.tenant : null
    const tenantId = String(tenantObj?.id ?? sub.tenant)
    const status: SubscriptionStatus = (sub.status as SubscriptionStatus) || 'active'
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
    const lastPayment = sub.lastPaymentAt ? new Date(sub.lastPaymentAt) : null
    const lastReminder = sub.lastReminderAt ? new Date(sub.lastReminderAt) : null

    const transition = async (to: SubscriptionStatus, extra: Record<string, unknown> = {}) => {
      const res = await cms('PATCH', `/api/subscriptions/${sub.id}`, { status: to, ...extra })
      if (res.ok) {
        result.transitions.push({ id: sub.id, tenantId, from: status, to })
        options.onTenantProcessed?.(tenantId)
      } else {
        result.errors.push(`transition ${sub.id} ${status}→${to}: ${res.status}`)
      }
    }

    const patchTenantTier = async (tier: string) => {
      const t = await cms('GET', `/api/tenants/${tenantId}?depth=0`)
      const settings = { ...(t.data?.settings || {}), activeTier: tier }
      const res = await cms('PATCH', `/api/tenants/${tenantId}`, { settings })
      if (res.ok) {
        options.onTenantProcessed?.(tenantId)
      } else {
        result.errors.push(`downgrade tenant ${tenantId}: ${res.status}`)
      }
    }

    const email = async (subject: string, html: string) => {
      if (!options.sendEmails) return
      try {
        const to = sub.billingEmail || tenantObj?.email || ''
        if (!to) return
        await sendEmail(to, subject, html)
        result.emails.push(subject)
      } catch {
        result.errors.push(`email ${tenantId}: ${subject}`)
      }
    }

    // Auto-restore : un paiement marqué après la fin de cycle remet le statut à jour
    if (['past_due', 'grace', 'suspended'].includes(status) && periodEnd && lastPayment && lastPayment > periodEnd) {
      const start = new Date(lastPayment.getTime())
      await transition('active', {
        currentPeriodStart: start.toISOString(),
        currentPeriodEnd: new Date(start.getTime() + PERIOD_DAYS * DAY_MS).toISOString(),
      })
      continue
    }

    // Trialing → active (premier paiement) ou expired (fin d'essai sans paiement)
    if (status === 'trialing') {
      if (periodEnd && now > periodEnd) {
        if (lastPayment) {
          const start = new Date(lastPayment.getTime())
          await transition('active', {
            currentPeriodStart: start.toISOString(),
            currentPeriodEnd: new Date(start.getTime() + PERIOD_DAYS * DAY_MS).toISOString(),
          })
        } else {
          await transition('expired', { notes: appendNote(sub, `Essai de ${TRIAL_DAYS} jours terminé sans paiement — downgrade vitrine`) })
          await patchTenantTier('vitrine')
          await email(
            'Votre essai Etabib est terminé',
            `<p>Bonjour,</p><p>Votre essai gratuit de ${TRIAL_DAYS} jours est terminé.</p><p>Votre espace praticien est passé en mode vitrine. Vos données sont conservées : <a href="mailto:${'contact@etabibi.ma'}">contactez-nous</a> pour reprendre votre abonnement.</p>`,
          )
        }
      }
      continue
    }

    if (status === 'active' && periodEnd && now > periodEnd) {
      await transition('past_due', { notes: appendNote(sub, 'Cycle dépassé sans paiement — J+0') })
      await email(
        'Rappel : votre abonnement Etabib arrive à échéance',
        `<p>Bonjour,</p><p>Votre abonnement mensuel n'a pas été réglé.</p><p>Vous pouvez régulariser par virement ou en <a href="mailto:${'contact@etabibi.ma'}">contactant le support</a>. Votre espace reste pleinement accessible pendant 14 jours.</p>`,
      )
      continue
    }

    if (status === 'past_due' && periodEnd) {
      const lateDays = daysBetween(periodEnd, now)
      if (lateDays >= 14) {
        await transition('grace', { notes: appendNote(sub, 'J+14 — passage en lecture seule') })
        await email(
          'Accès en lecture seule — régularisez votre abonnement',
          `<p>Bonjour,</p><p>Votre abonnement est en retard de 14 jours : votre espace passe en lecture seule.</p><p>Les dossiers patients restent consultables. Régularisez le paiement pour retrouver toutes les fonctionnalités.</p>`,
        )
      } else if (lateDays >= 7 && (!lastReminder || daysBetween(lastReminder, now) >= 7)) {
        await transition('past_due', { lastReminderAt: now.toISOString() })
        await email(
          'Rappel : paiement en retard',
          `<p>Bonjour,</p><p>Votre paiement est en retard de ${Math.floor(lateDays)} jours.</p><p>Régularisez rapidement pour éviter la restriction de votre espace.</p>`,
        )
      }
      continue
    }

    if (status === 'grace' && periodEnd) {
      const lateDays = daysBetween(periodEnd, now)
      if (lateDays >= 30) {
        await transition('suspended', { notes: appendNote(sub, 'J+30 — suspension') })
        await email(
          'Votre abonnement Etabib a été suspendu',
          `<p>Bonjour,</p><p>Votre abonnement est suspendu. Vos données sont conservées et votre espace pourra être restauré après régularisation.</p>`,
        )
      }
      continue
    }

    if (status === 'suspended' && periodEnd) {
      const lateDays = daysBetween(periodEnd, now)
      if (lateDays >= 210) {
        await transition('expired', { notes: appendNote(sub, 'Suspension de 180 jours — état terminal (données conservées)') })
      }
    }
  }

  return result
}
