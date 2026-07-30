'use client'

import dynamic from 'next/dynamic'

function CalendarShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">{children}</div>
}

function Skeleton() {
  return (
    <CalendarShell>
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-7 w-48 rounded-lg bg-stone-200" />
        <div className="grid grid-cols-7 gap-1">
          <div className="h-6 rounded bg-stone-200" />
          <div className="h-6 rounded bg-stone-200" />
          <div className="h-6 rounded bg-stone-200" />
          <div className="h-6 rounded bg-stone-200" />
          <div className="h-6 rounded bg-stone-200" />
          <div className="h-6 rounded bg-stone-200" />
          <div className="h-6 rounded bg-stone-200" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
          <div className="h-12 rounded bg-stone-100" />
        </div>
      </div>
    </CalendarShell>
  )
}

const RendezVousCalendarClient = dynamic(
  () => import('@/components/dashboard/RendezVousCalendarClient'),
  { ssr: false, loading: () => <Skeleton /> },
)

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

export default function CalendarWrapper({ initialBookings }: Props) {
  return <RendezVousCalendarClient initialBookings={initialBookings} />
}
