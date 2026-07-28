import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'
const WEBHOOK_SECRET = process.env.CALCOM_WEBHOOK_SECRET || ''

type CalWebhookPayload = {
  triggerEvent: string
  payload: {
    uid: string
    title: string
    startTime: string
    endTime: string
    duration?: number
    status: string
    eventType: { id: number; slug: string }
    organizer: { name: string; email: string; timeZone: string }
    attendees: { name: string; email: string; timeZone: string; phoneNumber?: string }[]
    location?: string | null
    metadata?: Record<string, unknown>
    responses?: Record<string, unknown>
    rescheduledFromUid?: string
    rescheduledToUid?: string
    cancellationReason?: string
  }
}

async function cmsApi(method: string, path: string, body?: unknown) {
  const res = await fetch(`${CMS_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data: json }
}

function mapStatus(calStatus: string): string {
  const map: Record<string, string> = {
    ACCEPTED: 'accepted', PENDING: 'pending', CANCELLED: 'cancelled', REJECTED: 'rejected',
    accepted: 'accepted', pending: 'pending', cancelled: 'cancelled', rejected: 'rejected',
  }
  return map[calStatus] || 'pending'
}

/* Désactivé en Phase 1 — remplacé par POST /api/bookings
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (!secret || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CalWebhookPayload
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { triggerEvent, payload } = body
  if (!triggerEvent || !payload?.uid) {
    return NextResponse.json({ error: 'Missing triggerEvent or payload.uid' }, { status: 400 })
  }

  const eventSlug = payload.eventType?.slug
  if (!eventSlug) {
    return NextResponse.json({ error: 'Missing eventType.slug' }, { status: 400 })
  }

  const tenantRes = await cmsApi('GET', `/api/tenants?where[calcomSettings.eventSlug][equals]=${encodeURIComponent(eventSlug)}&depth=0&limit=1`)
  const tenantDocs = tenantRes.data?.docs
  const tenantId = Array.isArray(tenantDocs) && tenantDocs.length > 0 ? tenantDocs[0].id : null
  if (!tenantId) {
    return NextResponse.json({ error: `No tenant found for slug: ${eventSlug}`, skipped: true }, { status: 200 })
  }

  const makeBookingData = () => ({
    bookingUid: payload.uid,
    tenant: tenantId,
    eventTypeSlug: eventSlug,
    title: payload.title,
    status: mapStatus(payload.status),
    startTime: payload.startTime,
    endTime: payload.endTime,
    duration: payload.duration ?? Math.round((new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime()) / 60000),
    attendeeName: payload.attendees?.[0]?.name || '',
    attendeeEmail: payload.attendees?.[0]?.email || '',
    attendeePhone: payload.attendees?.[0]?.phoneNumber || '',
    attendeeTimezone: payload.attendees?.[0]?.timeZone || '',
    location: payload.location || '',
    responses: payload.responses || {},
  })

  const eventHandlers: Record<string, () => Promise<NextResponse>> = {
    BOOKING_CREATED: async () => {
      const res = await cmsApi('POST', '/api/calbookings', makeBookingData())
      return NextResponse.json({ success: true, action: 'created', id: res.data?.doc?.id }, { status: res.ok ? 200 : 500 })
    },
    BOOKING_RESCHEDULED: async () => {
      const existing = await cmsApi('GET', `/api/calbookings?where[bookingUid][equals]=${payload.uid}&limit=1&depth=0`)
      const doc = existing.data?.docs?.[0]
      if (!doc) {
        const res = await cmsApi('POST', '/api/calbookings', makeBookingData())
        return NextResponse.json({ success: true, action: 'created-from-reschedule', id: res.data?.doc?.id }, { status: res.ok ? 200 : 500 })
      }
      const updateRes = await cmsApi('PATCH', `/api/calbookings/${doc.id}`, {
        startTime: payload.startTime,
        endTime: payload.endTime,
        duration: makeBookingData().duration,
        rescheduledFromUid: payload.rescheduledFromUid || null,
      })
      return NextResponse.json({ success: true, action: 'rescheduled', id: doc.id }, { status: updateRes.ok ? 200 : 500 })
    },
    BOOKING_CANCELLED: async () => {
      const existing = await cmsApi('GET', `/api/calbookings?where[bookingUid][equals]=${payload.uid}&limit=1&depth=0`)
      const doc = existing.data?.docs?.[0]
      if (!doc) {
        return NextResponse.json({ success: true, action: 'cancel-skipped', reason: 'not-found' }, { status: 200 })
      }
      const updateRes = await cmsApi('PATCH', `/api/calbookings/${doc.id}`, {
        status: 'cancelled',
        cancellationReason: payload.cancellationReason || null,
      })
      return NextResponse.json({ success: true, action: 'cancelled', id: doc.id }, { status: updateRes.ok ? 200 : 500 })
    },
  }

  const handler = eventHandlers[triggerEvent]
  if (!handler) {
    return NextResponse.json({ success: true, action: 'ignored', triggerEvent }, { status: 200 })
  }
  return handler()
}
*/
