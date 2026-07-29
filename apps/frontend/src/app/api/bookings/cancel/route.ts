import { NextRequest, NextResponse } from 'next/server'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_CMS_URL
  if (!url) throw new Error('NEXT_PUBLIC_CMS_URL manquant')
  return url
}

export async function GET(request: NextRequest) {
  const bookingUid = request.nextUrl.searchParams.get('uid')
  if (!bookingUid) {
    return new NextResponse('Lien invalide.', { status: 400 })
  }

  const res = await fetch(`${getCMSURL()}/api/calbookings?where[bookingUid][equals]=${encodeURIComponent(bookingUid)}&depth=0&limit=1`)
  const data = await res.json()
  const booking = data.docs?.[0]
  if (!booking) {
    return new NextResponse('Rendez-vous introuvable.', { status: 404 })
  }

  await fetch(`${getCMSURL()}/api/calbookings/${booking.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  return new NextResponse('Votre rendez-vous a été annulé.', { status: 200 })
}
