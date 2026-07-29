'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import ScheduleXCalendar from './ScheduleXCalendar'

type CalBooking = {
  id: string
  title: string
  startTime: string
  endTime: string
  attendeeName: string
}

type Props = {
  initialBookings: CalBooking[]
}

export default function RendezVousCalendarClient({ initialBookings }: Props) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [events, setEvents] = useState(
    initialBookings.map(b => ({
      id: b.id,
      title: `${b.attendeeName || 'Patient'} — ${b.title || 'Consultation'}`,
      start: b.startTime,
      end: b.endTime,
    }))
  )

  const handleRangeChange = useCallback(async (start: string, end: string) => {
    try {
      const res = await fetch(
        `/api/cms-proxy/calbookings?where[startTime][greater_than_equal]=${encodeURIComponent(start)}&where[startTime][less_than]=${encodeURIComponent(end)}&sort=startTime&depth=0&limit=200`
      )
      const data = await res.json()
      const docs: CalBooking[] = data.docs ?? []
      setEvents(
        docs.map(b => ({
          id: b.id,
          title: `${b.attendeeName || 'Patient'} — ${b.title || 'Consultation'}`,
          start: b.startTime,
          end: b.endTime,
        }))
      )
    } catch {
      // silence refetch errors
    }
  }, [])

  return (
    <ScheduleXCalendar
      events={events}
      onRangeChange={handleRangeChange}
      locale={locale}
      isRTL={isRTL}
    />
  )
}
