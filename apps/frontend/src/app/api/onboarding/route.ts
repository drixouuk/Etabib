import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient, createSubscriptionInvoice } from '@/lib/invoiceninja'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/resend-send'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'etabibi.ma'

const SUBDOMAIN_BLACKLIST = [
  'admin','api','app','www','mail','smtp','pop','imap','ftp','cdn','dev','staging',
  'test','demo','blog','shop','store','help','support','status','docs','dashboard',
  'cms','static','assets','media','files','images','img','css','js','web','portal',
  'site','www2','m','mobile','etabib','etabibi','root','localhost','null','undefined',
]

async function cmsPost(path: string, data: unknown) {
  const res = await fetch(`${CMS_URL}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data: json }
}

async function cmsPatch(path: string, data: unknown) {
  const res = await fetch(`${CMS_URL}/api${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data: json }
}

async function cmsDelete(path: string) {
  await fetch(`${CMS_URL}/api${path}`, { method: 'DELETE' })
}

async function createDefaultSlots(tenantId: string) {
  const days = ['1', '2', '3', '4', '5', '6']
  for (const dayOfWeek of days) {
    await cmsPost('/availability-slots', {
      tenant: tenantId,
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      durationMinutes: 30,
      bufferMinutes: 15,
      isActive: true,
    })
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!rateLimit(`onboarding:${ip}`, 3, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { domain, name, email, password, tier = 'vitrine', phone, specialty, fullName, doctorCount } = body

    if (!domain || !name || !email || !password || !fullName) {
      return NextResponse.json({ error: 'domain, name, fullName, email, password requis' }, { status: 400 })
    }

    const validTiers = ['vitrine', 'rdv', 'cabinet'] as const
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: `Tier invalide. Valeurs: ${validTiers.join(', ')}` }, { status: 400 })
    }

    const subdomain = domain.split('.')[0].toLowerCase()
    if (SUBDOMAIN_BLACKLIST.includes(subdomain)) {
      return NextResponse.json({ error: 'Ce nom de domaine est réservé' }, { status: 409 })
    }

    const checkRes = await fetch(`${CMS_URL}/api/tenants?where[domain][equals]=${encodeURIComponent(domain)}&limit=1`)
    const checkData = await checkRes.json()
    if (checkData?.docs?.length > 0) {
      return NextResponse.json({ error: 'Ce nom de domaine est déjà pris' }, { status: 409 })
    }

    const calendarToken = randomUUID()
    const verificationToken = randomUUID()
    let tenantId: string | null = null
    let userId: string | null = null

    try {
      const tenantRes = await cmsPost('/tenants', {
        name,
        domain,
        settings: {
          defaultLocale: 'fr',
          activeTier: tier,
          specialty: specialty || 'generaliste',
          doctorCount: tier === 'cabinet' ? (doctorCount || 1) : 1,
          calendarToken,
          verificationToken,
          emailVerified: false,
        },
      })
      if (!tenantRes.ok || !tenantRes.data?.doc?.id) {
        return NextResponse.json({ error: 'Erreur création tenant', detail: tenantRes.data }, { status: 500 })
      }
      tenantId = tenantRes.data.doc.id

      const userRes = await cmsPost('/users', {
        email,
        password,
        name: fullName,
        roles: ['tenant_admin', 'doctor'],
        tenant: tenantId,
      })
      if (!userRes.ok || !userRes.data?.doc?.id) {
        throw new Error('Erreur création utilisateur')
      }
      userId = userRes.data.doc.id

      const doctorRes = await cmsPost('/doctors', {
        name: fullName,
        specialty: specialty || 'generaliste',
        tenant: tenantId,
        slug: subdomain,
      })
      if (!doctorRes.ok) throw new Error('Erreur création docteur')

      const practiceRes = await cmsPost('/globals/practice-info', {
        phone: phone || '',
        tenant: tenantId,
      })
      if (!practiceRes.ok) throw new Error('Erreur création practice-info')

      if (tier !== 'vitrine' && tenantId) {
        await createDefaultSlots(tenantId)
      }

      if (tier !== 'vitrine') {
        try {
          const clientId = await createClient({ name, email, phone })
          if (clientId) {
            await createSubscriptionInvoice(clientId, tier)
          }
        } catch {
          // Invoice Ninja non configuré — silencieux
        }
      }

      const loginUrl = `https://${domain}/fr/login`
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || `https://${SITE_DOMAIN}`}/api/onboarding/verify-email?token=${verificationToken}`

      await Promise.allSettled([
        sendEmail(
          email,
          'Vérifiez votre adresse email — Etabib',
          `<p>Bonjour ${fullName},</p><p>Merci d'avoir créé votre espace Etabib.</p><p><a href="${verificationUrl}">Cliquez ici pour vérifier votre adresse email</a></p><p>Ce lien expire dans 48h.</p>`,
        ),
        sendEmail(
          email,
          `Bienvenue sur Etabib, ${fullName} !`,
          `<p>Bonjour ${fullName},</p><p>Votre cabinet <strong>${name}</strong> est prêt.</p><p>Votre site : <a href="https://${domain}">https://${domain}</a></p><p>Connexion : <a href="${loginUrl}">${loginUrl}</a></p><p>L'équipe Etabib</p>`,
        ),
      ])

      return NextResponse.json({
        success: true,
        tenant: { id: tenantId, domain },
        user: { email },
      })
    } catch (err) {
      if (userId && tenantId) {
        await cmsDelete(`/users/${userId}`)
        await cmsDelete(`/tenants/${tenantId}`)
      }
      throw err
    }
  } catch (err) {
    return NextResponse.json({ error: 'Erreur interne', detail: String(err) }, { status: 500 })
  }
}
