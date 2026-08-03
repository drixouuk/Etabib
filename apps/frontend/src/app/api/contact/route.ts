import { NextRequest, NextResponse } from 'next/server'
import { verifyTurnstile, clientRemoteIp } from '@/lib/turnstile'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, message, 'cf-turnstile-response': turnstileToken } = body

  if (!name || !phone || !message) {
    return NextResponse.json({ error: 'Champs requis' }, { status: 400 })
  }

  if (!(await verifyTurnstile(turnstileToken, clientRemoteIp(request)))) {
    return NextResponse.json({ error: 'Vérification anti-bot échouée' }, { status: 403 })
  }

  const res = await fetch(`${CMS_URL}/api/contact-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, message }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
