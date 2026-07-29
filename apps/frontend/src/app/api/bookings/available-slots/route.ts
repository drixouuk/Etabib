import { NextRequest, NextResponse } from 'next/server'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_getCMSURL()
  if (!url) throw new Error('NEXT_PUBLIC_getCMSURL() manquant')
  return url
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  const tenantId = request.headers.get('x-tenant-id') || request.nextUrl.searchParams.get('tenantId')

  if (!date || !tenantId) {
    return NextResponse.json({ error: 'date et tenantId requis' }, { status: 400 })
  }

  const dayStart = new Date(date)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const busyRes = await fetch(
    `${getCMSURL()}/api/calbookings?where[tenant][equals]=${encodeURIComponent(tenantId)}&where[startTime][greater_than_equal]=${dayStart.toISOString()}&where[startTime][less_than]=${dayEnd.toISOString()}&where[status][not_equals]=cancelled&depth=0&limit=100`,
    { headers: { 'Content-Type': 'application/json' } }
  )
  const busyData = await busyRes.json()
  const busySlots: string[] = (busyData.docs ?? []).map((b: { startTime: string }) => {
    const d = new Date(b.startTime)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })

  return NextResponse.json({
    date,
    slotDurationMinutes: 30,
    busySlots,
  })
}
