import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_CMS_URL
  if (!url) throw new Error('NEXT_PUBLIC_CMS_URL manquant')
  return url
}
const API_KEY = process.env.INTERNAL_BOOKING_API_KEY

const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
if (API_KEY) apiHeaders['x-internal-api-key'] = API_KEY

export async function GET(request: NextRequest) {
  const bookingUid = request.nextUrl.searchParams.get('uid')
  if (!bookingUid) {
    return new NextResponse('Lien invalide.', { status: 400 })
  }

  const res = await fetch(`${getCMSURL()}/api/calbookings?where[bookingUid][equals]=${encodeURIComponent(bookingUid)}&depth=0&limit=1`, { headers: apiHeaders })
  const data = await res.json()
  const booking = data.docs?.[0]
  if (!booking) {
    return new NextResponse('Rendez-vous introuvable.', { status: 404 })
  }

  await fetch(`${getCMSURL()}/api/calbookings/${booking.id}`, {
    method: 'PATCH',
    headers: apiHeaders,
    body: JSON.stringify({ status: 'cancelled' }),
  })

  // B7 — annulation : les lectures calbookings mises en cache se rafraîchissent.
  revalidateTag('col:calbookings', 'default')

  return new NextResponse('Votre rendez-vous a été annulé.', { status: 200 })
}
