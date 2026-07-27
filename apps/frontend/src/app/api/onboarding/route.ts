import { NextRequest, NextResponse } from 'next/server'
import { createClient, createSubscriptionInvoice } from '@/lib/invoiceninja'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'

async function cmsPost(path: string, data: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${CMS_URL}/api${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data: json }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, name, email, password, tier = 'vitrine', phone, specialty, doctorCount } = body

    if (!domain || !name || !email || !password) {
      return NextResponse.json(
        { error: 'domain, name, email, password requis' },
        { status: 400 },
      )
    }

    const validTiers = ['vitrine', 'rdv', 'cabinet']
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Tier invalide. Valeurs: ${validTiers.join(', ')}` },
        { status: 400 },
      )
    }

    // 1. Créer le Tenant
    const tenantRes = await cmsPost('/tenants', {
      name,
      domain,
      settings: { defaultLocale: 'fr', activeTier: tier, specialty: specialty || 'generaliste', doctorCount: tier === 'cabinet' ? (doctorCount || 1) : 1 },
      calcomSettings: {
        eventSlug: body.eventSlug || 'consultation',
        username: body.username || '',
        customUrl: body.customUrl || '',
      },
    })
    if (!tenantRes.ok) {
      return NextResponse.json(
        { error: "Erreur création tenant", detail: tenantRes.data },
        { status: 500 },
      )
    }
    const tenantId = tenantRes.data?.doc?.id
    if (!tenantId) {
      return NextResponse.json(
        { error: 'ID tenant manquant' },
        { status: 500 },
      )
    }

    // 2. Créer l'utilisateur tenant_admin
    const userRes = await cmsPost('/users', {
      email,
      password,
      name,
      roles: ['tenant_admin', 'doctor'],
      tenant: tenantId,
    })
    if (!userRes.ok) {
      return NextResponse.json(
        { error: "Erreur création utilisateur", detail: userRes.data },
        { status: 500 },
      )
    }

    // 3. Créer la fiche client Invoice Ninja (si configuré)
    let invoiceNinjaClientId: string | null = null
    try {
      invoiceNinjaClientId = await createClient({ name, email, phone })
    } catch {
      // Invoice Ninja non configuré — on continue
    }

    // 4. Facture d'abonnement
    let invoiceId: string | null = null
    if (invoiceNinjaClientId && tier !== 'vitrine') {
      try {
        invoiceId = await createSubscriptionInvoice(invoiceNinjaClientId, tier)
      } catch {
        // La facturation échoue silencieusement
      }
    }

    return NextResponse.json({
      success: true,
      tenant: { id: tenantId, domain },
      user: { email },
      billing: {
        invoiceNinjaClientId,
        invoiceId,
        tier,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Erreur interne', detail: String(err) },
      { status: 500 },
    )
  }
}
