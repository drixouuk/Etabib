'use client'

import { useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import BookingSheet, { type BookingDraft } from './BookingSheet'
import BookingListView from './BookingListView'
import type { CalBooking } from '@/lib/booking'

const ScheduleXCalendar = dynamic(() => import('./ScheduleXCalendar'), { ssr: false })

type Props = {
  initialBookings: CalBooking[]
  tenantId: string
}

const SCHEDULE_X_LOCALE: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-SA',
  tzm: 'fr-FR',
}

function toEvent(b: CalBooking) {
  return {
    id: b.id,
    title: `${b.attendeeName || 'Patient'} — ${b.title || 'Consultation'}`,
    start: b.startTime,
    end: b.endTime,
  }
}

export default function RendezVousCalendarClient({ initialBookings, tenantId }: Props) {
  const rawLocale = useLocale()
  const isRTL = rawLocale === 'ar'
  const locale = SCHEDULE_X_LOCALE[rawLocale] || 'fr-FR'
  const router = useRouter()

  const [events, setEvents] = useState(initialBookings.map(toEvent))
  const [bookingsById, setBookingsById] = useState<Record<string, CalBooking>>(() =>
    Object.fromEntries(initialBookings.map(b => [b.id, b]))
  )
  const [creatingStart, setCreatingStart] = useState<string | null>(null)
  const [editing, setEditing] = useState<CalBooking | null>(null)
  const rangeRef = useRef<{ start: string; end: string } | null>(null)

  const handleRangeChange = useCallback(async (start: string, end: string) => {
    rangeRef.current = { start, end }
    try {
      const res = await fetch(
        `/api/cms-proxy/calbookings?where[startTime][greater_than_equal]=${encodeURIComponent(start)}&where[startTime][less_than]=${encodeURIComponent(end)}&sort=startTime&depth=0&limit=200`
      )
      const data = await res.json()
      const docs: CalBooking[] = data.docs ?? []
      setEvents(docs.map(toEvent))
      setBookingsById(Object.fromEntries(docs.map(b => [b.id, b])))
    } catch {
      // silence refetch errors
    }
  }, [])

  const handleDateClick = useCallback((date: string) => {
    setEditing(null)
    setCreatingStart(date)
  }, [])

  const handleEventClick = useCallback((event: { id: string | number; title: string; start: string; end: string }) => {
    const known = bookingsById[String(event.id)]
    setCreatingStart(null)
    if (known) { setEditing(known); return }
    setEditing({
      id: String(event.id),
      bookingUid: '',
      title: event.title,
      status: 'accepted',
      startTime: event.start,
      endTime: event.end,
      duration: 30,
      attendeeName: '',
      attendeeEmail: '',
      attendeePhone: '',
      location: null,
      createdAt: '',
    })
  }, [bookingsById])

  const handleListEdit = useCallback((b: CalBooking) => {
    setCreatingStart(null)
    setEditing(b)
  }, [])

  const closeSheet = useCallback(() => {
    setCreatingStart(null)
    setEditing(null)
  }, [])

  const refresh = useCallback(async () => {
    if (rangeRef.current) {
      await handleRangeChange(rangeRef.current.start, rangeRef.current.end)
    } else {
      setEvents(initialBookings.map(toEvent))
    }
    router.refresh()
  }, [handleRangeChange, initialBookings, router])

  const editingDraft: BookingDraft | null = editing
    ? {
        id: editing.id,
        status: editing.status,
        startTime: editing.startTime,
        endTime: editing.endTime,
        duration: editing.duration,
        attendeeName: editing.attendeeName,
        attendeeEmail: editing.attendeeEmail,
        attendeePhone: editing.attendeePhone,
        title: editing.title,
        location: editing.location,
      }
    : null

  return (
    <>
      <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <ScheduleXCalendar
          events={events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onRangeChange={handleRangeChange}
          locale={locale}
          isRTL={isRTL}
        />
      </div>
      <BookingListView bookings={initialBookings} onEdit={handleListEdit} />
      <BookingSheet
        tenantId={tenantId}
        booking={editingDraft}
        initialStart={creatingStart}
        onClose={closeSheet}
        onSaved={refresh}
      />
    </>
  )
}
