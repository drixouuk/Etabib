'use client'

import { useEffect, useRef } from 'react'
import { createCalendar, viewWeek, viewMonthGrid } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import 'temporal-polyfill/global'
import { Temporal } from 'temporal-polyfill'
import '@schedule-x/theme-default/dist/index.css'
import './ScheduleXCalendar.css'

type CalendarEvent = { id: string | number; title: string; start: string; end: string }

type Props = {
  events: CalendarEvent[]
  onDateClick?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onRangeChange?: (start: string, end: string) => void
  locale?: string
  isRTL?: boolean
}

// Schedule-X v4 exige des instances Temporal.ZonedDateTime pour start/end, et
// valide via `instanceof` contre le Temporal GLOBAL (navigateur natif ou polyfill
// installé par 'temporal-polyfill/global'). La conversion ci-dessous utilise la
// même implémentation que le global : les classes sont donc identiques.
function toTemporalEvents(events: CalendarEvent[]) {
  const out: { id: string | number; title: string; start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }[] = []
  for (const e of events) {
    try {
      const startISO = new Date(e.start).toISOString()
      const endISO = new Date(e.end || e.start).toISOString()
      out.push({
        id: e.id,
        title: e.title,
        start: Temporal.ZonedDateTime.from(startISO),
        end: Temporal.ZonedDateTime.from(endISO),
      })
    } catch {
      // event invalide — ignoré
    }
  }
  return out
}

type HasInstant = { toInstant?: () => { toString(): string } }

// Renvoie un ISO UTC "2026-07-31T10:00:00Z" quel que soit le type Temporal reçu
function toUTCIso(value: HasInstant | null | undefined): string {
  if (!value) return ''
  return value.toInstant ? value.toInstant().toString() : String(value)
}

export default function ScheduleXCalendar({ events, onDateClick, onEventClick, onRangeChange, locale, isRTL }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<ReturnType<typeof createCalendar> | null>(null)
  const eventsServiceRef = useRef<ReturnType<typeof createEventsServicePlugin> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const eventsService = createEventsServicePlugin()
    eventsServiceRef.current = eventsService
    const calendar = createCalendar({
      views: [viewMonthGrid, viewWeek],
      defaultView: 'month-grid',
      dayBoundaries: { start: '07:00', end: '19:00' },
      plugins: [eventsService],
      locale,
      events: toTemporalEvents(events),
      callbacks: {
        onClickDateTime(dateTime) {
          onDateClick?.(toUTCIso(dateTime))
        },
        onEventClick(event) {
          onEventClick?.({ id: event.id, title: event.title as string, start: toUTCIso(event.start), end: toUTCIso(event.end) })
        },
        onRangeUpdate(range) {
          onRangeChange?.(toUTCIso(range.start), toUTCIso(range.end))
        },
      },
    })
    calendar.render(containerRef.current)
    calendarRef.current = calendar
    return () => { calendarRef.current = null; eventsServiceRef.current = null }
  }, [])

  useEffect(() => {
    eventsServiceRef.current?.set(toTemporalEvents(events))
  }, [events])

  return (
    <div ref={containerRef} dir={isRTL ? 'rtl' : 'ltr'} className="schedule-x-calendar" />
  )
}
