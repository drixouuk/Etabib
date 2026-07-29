import { NextRequest, NextResponse } from 'next/server'
import { NOTIFICATIONS_EMAIL, BRAND } from '@/lib/brand'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_CMS_URL
  if (!url) throw new Error('NEXT_PUBLIC_CMS_URL manquant')
  return url
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY manquant' }, { status: 500 })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const start = new Date(tomorrow)
  start.setHours(0, 0, 0, 0)
  const end = new Date(tomorrow)
  end.setHours(23, 59, 59, 999)

  const res = await fetch(
    `${getCMSURL()}/api/calbookings?where[status][equals]=accepted&where[startTime][greater_than_equal]=${start.toISOString()}&where[startTime][less_than_equal]=${end.toISOString()}&depth=0&limit=100`
  )
  const data = await res.json()
  let reminded = 0

  for (const booking of (data.docs ?? [])) {
    if (!booking.attendeeEmail) continue
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${BRAND.name} <${NOTIFICATIONS_EMAIL}>`,
          to: booking.attendeeEmail,
          subject: 'Rappel : rendez-vous demain',
          html: `
            <h2>Rappel de rendez-vous</h2>
            <p>Bonjour ${booking.attendeeName},</p>
            <p>Nous vous rappelons votre rendez-vous de demain à <strong>${new Date(booking.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong>.</p>
            <p>À demain !</p>
          `,
        }),
      })
      reminded++
    } catch {}
  }

  return NextResponse.json({ reminded })
}
