import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'etabibi.ma'

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = req.nextUrl.searchParams.get('token')

  const tenantRes = await fetch(`${CMS_URL}/api/tenants?where[domain][equals]=${slug}.${SITE_DOMAIN}&limit=1`)
  const tenantData = await tenantRes.json()
  const tenant = tenantData?.docs?.[0]
  if (!tenant || tenant.settings?.calendarToken !== token) {
    return new Response('Not found', { status: 404 })
  }

  const bookingsRes = await fetch(
    `${CMS_URL}/api/calbookings?where[tenant][equals]=${tenant.id}&where[status][equals]=accepted&where[startTime][greater_than]=${new Date().toISOString()}&limit=500&depth=0`,
  )
  const bookingsData = await bookingsRes.json()
  const bookings = bookingsData?.docs ?? []

  const events = bookings.map((b: any) => {
    const uid = b.bookingUid || b.id
    const start = formatICSDate(new Date(b.startTime))
    const end = formatICSDate(new Date(b.endTime))
    const summary = b.title || 'Consultation'
    const description = `Patient: ${b.attendeeName || 'N/A'}\\nTéléphone: ${b.attendeePhone || 'N/A'}`
    return `BEGIN:VEVENT
UID:${uid}
DTSTART:${start}
DTEND:${end}
SUMMARY:${escapeICS(summary)}
DESCRIPTION:${description}
END:VEVENT`
  }).join('\r\n')

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Etabib//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${tenant.name} - Etabib
${events}
END:VCALENDAR`

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
