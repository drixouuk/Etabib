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
}

export default function ScheduleXCalendar({ events, onDateClick, onEventClick }: Props) {
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
      plugins: [eventsService],
      events: events.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })),
      callbacks: {
        onClickDateTime(dateTime) {
          onDateClick?.(dateTime.toString())
        },
        onEventClick(event) {
          onEventClick?.({ id: event.id, title: event.title as string, start: event.start.toString(), end: event.end.toString() })
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

  return <div ref={containerRef} className="schedule-x-calendar" />
}
