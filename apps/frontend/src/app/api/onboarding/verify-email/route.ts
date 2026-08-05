import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token manquant' }, { status: 400 })

  const res = await fetch(`${CMS_URL}/api/tenants?where[settings.verificationToken][equals]=${encodeURIComponent(token)}&limit=1`)
  const data = await res.json()
  const tenant = data?.docs?.[0]
  if (!tenant) {
    return NextResponse.json({ error: 'Token invalide ou déjà utilisé' }, { status: 404 })
  }

  await fetch(`${CMS_URL}/api/tenants/${tenant.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: {
        ...tenant.settings,
        emailVerified: true,
        verificationToken: null,
      },
    }),
  })

  // Domain public (le lien de vérification est envoyé par email avec le
  // domaine public du tenant) : request.url porte l'hôte interne du proxy.
  const forwardedHost = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https'
  return NextResponse.redirect(new URL('/fr/login?verified=true', `${forwardedProto}://${forwardedHost}`))
}
