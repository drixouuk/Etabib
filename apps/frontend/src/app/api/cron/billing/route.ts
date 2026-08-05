import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { runBillingCycle, type CmsApi } from '@/lib/billing-cycle'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_CMS_URL
  if (!url) throw new Error('NEXT_PUBLIC_CMS_URL manquant')
  return url
}

// Appels CMS internes (clé API) — le cron n'a pas de session utilisateur.
// Les paths passés commencent déjà par /api (contrat de lib/billing-cycle).
const cms: CmsApi = async (method, path, body) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = process.env.INTERNAL_BOOKING_API_KEY
  if (apiKey) headers['x-internal-api-key'] = apiKey
  const res = await fetch(`${getCMSURL()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runBillingCycle(cms, { sendEmails: true })

  // B7 — le cron a pu changer les statuts d'abonnement : les lectures mises
  // en cache (bannière facturation, gardes d'écriture) reflètent le cycle.
  revalidateTag('col:subscriptions', 'default')
  revalidateTag('col:tenants', 'default')

  return NextResponse.json(result)
}
