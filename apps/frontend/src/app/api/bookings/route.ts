import { NextRequest, NextResponse } from 'next/server'
import { moroccoWallTimeToUTC } from '@/lib/morocco-time'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_CMS_URL
  if (!url) throw new Error('NEXT_PUBLIC_CMS_URL manquant')
  return url
}
const API_KEY = process.env.INTERNAL_BOOKING_API_KEY

const rateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Trop de requêtes. Veuillez patienter.' }, { status: 429 })
  }

  const body = await request.json()
  const { name, phone, email, startTime } = body
  if (!name || !startTime) {
    return NextResponse.json({ error: 'Nom et créneau requis' }, { status: 400 })
  }

  const moroccoDate = moroccoWallTimeToUTC(startTime)
  if (isNaN(moroccoDate.getTime())) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }

  if (moroccoDate <= new Date()) {
    return NextResponse.json({ error: 'Créneau déjà passé' }, { status: 400 })
  }

  const endDate = new Date(moroccoDate.getTime() + 30 * 60000)
  const tenantIdRaw = body.tenantId || request.headers.get('x-tenant-id') || ''
  const tenantId = parseInt(tenantIdRaw, 10)
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant invalide' }, { status: 400 })
  }

  // Vérifier que le créneau est dans une plage de disponibilité active
  const dayOfWeek = String(moroccoDate.getDay())
  const timeStr = `${String(moroccoDate.getHours()).padStart(2, '0')}:${String(moroccoDate.getMinutes()).padStart(2, '0')}`
  const slotsCheck = await fetch(
    `${getCMSURL()}/api/availability-slots?where[tenant][equals]=${encodeURIComponent(tenantId)}&where[dayOfWeek][equals]=${dayOfWeek}&where[isActive][equals]=true&where[startTime][less_than_equal]=${timeStr}&where[endTime][greater_than]=${timeStr}&depth=0&limit=1`,
    { headers: { 'Content-Type': 'application/json' } }
  )
  const slots = await slotsCheck.json()
  if (!slots.docs?.length) {
    return NextResponse.json({ error: 'Créneau hors plage de disponibilité' }, { status: 400 })
  }

  const conflictRes = await fetch(
    `${getCMSURL()}/api/calbookings?where[tenant][equals]=${encodeURIComponent(tenantId)}&where[startTime][less_than]=${endDate.toISOString()}&where[endTime][greater_than]=${moroccoDate.toISOString()}&where[status][not_equals]=cancelled&depth=0&limit=1`,
    { headers: { 'Content-Type': 'application/json' } }
  )
  const conflicts = await conflictRes.json()
  if (conflicts.docs?.length > 0) {
    return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
  }

  const bookingUid = `booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['x-internal-api-key'] = API_KEY

  const res = await fetch(`${getCMSURL()}/api/calbookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bookingUid,
      tenant: tenantId,
      eventTypeSlug: 'consultation',
      title: 'Consultation',
      status: 'accepted',
      startTime: moroccoDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: 30,
      attendeeName: name.trim(),
      attendeeEmail: email?.trim() || '',
      attendeePhone: phone?.trim() || '',
      location: '',
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    if (errBody?.errors?.[0]?.message?.includes('duplicate') || errBody?.errors?.[0]?.message?.includes('unique')) {
      return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur serveur lors de la création' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
