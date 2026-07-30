import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(request: NextRequest) {
  if (!CMS_URL) return NextResponse.json({ error: 'Service non configuré' }, { status: 500 })
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  const weekStart = request.nextUrl.searchParams.get('weekStart')
  if (!tenantId || !weekStart) {
    return NextResponse.json({ error: 'tenantId et weekStart requis' }, { status: 400 })
  }
  const tid = parseInt(tenantId, 10)
  if (!tid) return NextResponse.json({ error: 'Tenant invalide' }, { status: 400 })

  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const [slotsRes, bookingsRes] = await Promise.all([
    fetch(`${CMS_URL}/api/availability-slots?where[tenant][equals]=${tid}&where[isActive][equals]=true&depth=0&limit=100`),
    fetch(`${CMS_URL}/api/calbookings?where[tenant][equals]=${tid}&where[startTime][greater_than_equal]=${start.toISOString()}&where[startTime][less_than]=${end.toISOString()}&where[status][not_equals]=cancelled&depth=0&limit=200`),
  ])

  const [slotsData, bookingsData] = await Promise.all([slotsRes.json(), bookingsRes.json()])

  const availabilityByDay: Record<string, any[]> = {}
  for (const s of (slotsData.docs ?? [])) {
    (availabilityByDay[s.dayOfWeek] ??= []).push(s)
  }

  const bookedTimes: Record<string, Set<string>> = {}
  for (const b of (bookingsData.docs ?? [])) {
    const d = new Date(b.startTime)
    const dayKey = toLocalISODate(d)
    const timeKey = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    ;(bookedTimes[dayKey] ??= new Set()).add(timeKey)
  }

  const now = new Date()
  const days: { iso: string; dayOfWeek: number; available: boolean; times: string[] }[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const dow = String(date.getDay())
    const daySlots = availabilityByDay[dow] ?? []
    const iso = toLocalISODate(date)

    const times = new Set<string>()
    for (const slot of daySlots) {
      const [sh, sm] = slot.startTime.split(':').map(Number)
      const [eh, em] = slot.endTime.split(':').map(Number)
      const duration = slot.durationMinutes ?? 30
      const buffer = slot.bufferMinutes ?? 0
      let cursor = sh * 60 + sm
      const endMinutes = eh * 60 + em
      while (cursor + duration <= endMinutes) {
        const h = Math.floor(cursor / 60)
        const m = cursor % 60
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        const slotDateTime = new Date(date)
        slotDateTime.setHours(h, m, 0, 0)
        if (slotDateTime > now && !(bookedTimes[iso]?.has(t))) times.add(t)
        cursor += duration + buffer
      }
    }
    days.push({ iso, dayOfWeek: date.getDay(), available: times.size > 0, times: [...times].sort() })
  }

  return NextResponse.json({ days })
}
