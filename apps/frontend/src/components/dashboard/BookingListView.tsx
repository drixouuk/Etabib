'use client'

import { useState, useMemo } from 'react'
import { Clock, Mail, Phone, Video, Calendar, MapPin } from 'lucide-react'

type CalBooking = {
  id: string
  bookingUid: string
  title: string
  status: 'accepted' | 'pending' | 'cancelled' | 'rejected'
  startTime: string
  endTime: string
  duration: number
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  location: string | null
  cancellationReason?: string | null
  responses?: Record<string, unknown>
  createdAt: string
}

type Props = {
  bookings: CalBooking[]
}

export default function BookingListView({ bookings }: Props) {
  const [viewMode, setViewMode] = useState<'upcoming' | 'past'>('upcoming')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const now = new Date()

  const { upcoming, past } = useMemo(() => {
    const u = bookings
      .filter((b) => new Date(b.startTime) >= now && b.status !== 'cancelled' && b.status !== 'rejected')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    const p = bookings
      .filter((b) => new Date(b.startTime) < now || b.status === 'cancelled' || b.status === 'rejected')
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    return { upcoming: u, past: p }
  }, [bookings])

  const activeList = viewMode === 'upcoming' ? upcoming : past
  const visibleItems = activeList.slice(0, page * PER_PAGE)
  const hasMore = activeList.length > page * PER_PAGE

  const statusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Confirmé</span>
      case 'pending': return <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">En attente</span>
      case 'cancelled': return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-ink-soft line-through decoration-stone-400">Annulé</span>
      case 'rejected': return <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">Refusé</span>
      default: return null
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}` : `${h}h`
  }

  return (
    <div>
      <div className="mb-6 inline-flex rounded-lg bg-stone-100 p-0.5">
        <button
          onClick={() => { setViewMode('upcoming'); setPage(1) }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            viewMode === 'upcoming' ? 'bg-white text-ink shadow-warm-sm' : 'text-ink-soft hover:text-ink'
          }`}
        >
          À venir ({upcoming.length})
        </button>
        <button
          onClick={() => { setViewMode('past'); setPage(1) }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            viewMode === 'past' ? 'bg-white text-ink shadow-warm-sm' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Passés ({past.length})
        </button>
      </div>

      {visibleItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-warm bg-white py-12 text-center shadow-warm-sm">
          <Calendar className="size-12 text-stone-300" />
          <p className="mt-4 text-sm font-medium text-ink-soft">
            {viewMode === 'upcoming' ? "Aucun rendez-vous à venir aujourd'hui" : "Aucun rendez-vous passé aujourd'hui"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.map((booking) => (
          <div key={booking.id} className={`rounded-xl border border-warm bg-white p-4 shadow-warm-sm ${booking.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-sm font-semibold text-primary-700">
                  <Clock className="size-3.5" />
                  {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                </span>
                <span className="text-xs text-ink-softer">({formatDuration(booking.duration)})</span>
              </div>
              {statusBadge(booking.status)}
            </div>

            <div className="mt-3 space-y-1">
              <p className="font-heading text-base font-semibold text-ink">{booking.attendeeName || 'Patient'}</p>
              {booking.title && <p className="text-sm text-ink-soft">{booking.title}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
                {booking.attendeeEmail && (
                  <span className="inline-flex items-center gap-1"><Mail className="size-3" />{booking.attendeeEmail}</span>
                )}
                {booking.attendeePhone && (
                  <span className="inline-flex items-center gap-1"><Phone className="size-3" />{booking.attendeePhone}</span>
                )}
              </div>
            </div>

            {booking.location && booking.status !== 'cancelled' && (
              <div className="mt-2">
                <a href={booking.location} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors duration-200 hover:bg-primary-100">
                  {booking.location.startsWith('http') ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
                  {booking.location.startsWith('http') ? 'Rejoindre la visio' : booking.location}
                </a>
              </div>
            )}

            {booking.cancellationReason && (
              <p className="mt-2 text-xs italic text-ink-softer">Motif : {booking.cancellationReason}</p>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button onClick={() => setPage((p) => p + 1)}
          className="mt-4 w-full rounded-lg border border-warm bg-white py-2 text-sm font-medium text-primary-600 transition-colors duration-200 hover:bg-stone-50 hover:text-primary-700">
          Voir plus ({activeList.length - visibleItems.length} restants)
        </button>
      )}
    </div>
  )
}
