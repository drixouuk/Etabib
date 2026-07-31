'use client'

import { useEffect, useRef } from 'react'
import { createCalendar, viewWeek, viewMonthGrid } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { Temporal } from 'temporal-polyfill'
import '@schedule-x/theme-default/dist/index.css'

type CalendarEvent = { id: string | number; title: string; start: string; end: string }

type Props = {
  events: CalendarEvent[]
  onDateClick?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onRangeChange?: (start: string, end: string) => void
  locale?: string
  isRTL?: boolean
}

// Schedule-X v4 exige des instances Temporal.ZonedDateTime/PlainDate pour start/end.
// Normalise via Date puis convertit en ZonedDateTime UTC ; ignore les valeurs invalides.
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
          onDateClick?.(dateTime.toString())
        },
        onEventClick(event) {
          onEventClick?.({ id: event.id, title: event.title as string, start: event.start.toString(), end: event.end.toString() })
        },
        onRangeUpdate(range) {
          onRangeChange?.(range.start.toString(), range.end.toString())
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
    <>
      <div ref={containerRef} dir={isRTL ? 'rtl' : 'ltr'} className="schedule-x-calendar" />
      <style>{`
        .schedule-x-calendar {
          --sx-color-primary: #0D9488;
          --sx-color-on-primary: #FFFFFF;
          --sx-color-primary-container: #F0FDFA;
          --sx-color-on-primary-container: #115E59;
          --sx-color-secondary: #FFF7E0;
          --sx-color-on-secondary: #292524;
          --sx-color-surface: #FFFFFF;
          --sx-color-on-surface: #292524;
          --sx-color-background: #FFFBF0;
          --sx-color-on-background: #78716C;
          --sx-color-outline: #E7E5E4;
          --sx-color-outline-variant: #D6D3D1;
          --sx-color-neutral-variant: #D6D3D1;
          --sx-color-surface-container: #FFFBF0;
          --sx-color-surface-container-low: #FFFDF7;
          --sx-color-surface-container-high: #FFF7E0;
          --sx-color-surface-dim: #EFEDE3;
        }
        .schedule-x-calendar .sx__event {
          background-color: #0D9488;
          border-color: #0D9488;
          color: #FFFFFF;
          border-radius: 6px;
          padding: 2px 6px;
          font-size: .78rem;
        }
        .schedule-x-calendar .sx__today .sx__date-number {
          background-color: #0D9488;
          color: #FFFFFF;
          border-radius: 9999px;
        }
        .schedule-x-calendar .sx__date-picker-wrapper,
        .schedule-x-calendar .sx__date-picker-button,
        .schedule-x-calendar .sx__header {
          font-family: Figtree, sans-serif;
        }
        .schedule-x-calendar .sx__month-view-heading {
          font-size: .7rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #A8A29E;
        }
      `}</style>
    </>
  )
}
