'use client'

import { useEffect, useRef } from 'react'
import { createCalendar, viewWeek, viewMonthGrid } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
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
      events: events.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })),
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
    eventsServiceRef.current?.set(events.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })))
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
          --sx-color-border: #E7E5E4;
          --sx-color-neutral-variant: #D6D3D1;
          --sx-color-tonal-container: #F0FDFA;
          --sx-color-on-tonal-container: #0D9488;
          --sx-color-surface-container: #FFFBF0;
          --sx-color-surface-container-low: #FFFDF7;
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
        .schedule-x-calendar .sx__date-picker-wrapper {
          font-family: Figtree, sans-serif;
        }
        .schedule-x-calendar .sx__date-picker-button {
          font-family: Figtree, sans-serif;
          font-weight: 600;
        }
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
