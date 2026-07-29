import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, message } = body

  if (!name || !phone || !message) {
    return NextResponse.json({ error: 'Champs requis' }, { status: 400 })
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
