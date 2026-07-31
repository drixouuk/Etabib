'use client'

import { useState, useMemo } from 'react'
import { Clock, Mail, Phone, Video, Calendar, MapPin } from 'lucide-react'
import type { CalBooking } from '@/lib/booking'

type Props = {
  bookings: CalBooking[]
  onEdit?: (booking: CalBooking) => void
}

export default function BookingListView({ bookings, onEdit }: Props) {
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
      case 'cancelled': return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 line-through decoration-stone-400">Annulé</span>
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
            viewMode === 'upcoming' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
          }`}
        >
          À venir ({upcoming.length})
        </button>
        <button
          onClick={() => { setViewMode('past'); setPage(1) }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            viewMode === 'past' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
          }`}
        >
          Passés ({past.length})
        </button>
      </div>

      {visibleItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-warm bg-white py-12 text-center shadow-sm">
          <Calendar className="size-12 text-stone-300" />
          <p className="mt-4 text-sm font-medium text-stone-600">
            {viewMode === 'upcoming' ? "Aucun rendez-vous à venir aujourd'hui" : "Aucun rendez-vous passé aujourd'hui"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.map((booking) => (
          <div key={booking.id} className={`rounded-xl border border-warm bg-white p-4 shadow-sm ${booking.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-sm font-semibold text-primary-700">
                  <Clock className="size-3.5" />
                  {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                </span>
                <span className="text-xs text-stone-600">({formatDuration(booking.duration)})</span>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(booking.status)}
                {booking.status === 'accepted' && viewMode === 'upcoming' && (
                  <button
                    onClick={async () => {
                      if (!confirm('Annuler ce rendez-vous ?')) return
                      await fetch(`/api/cms-proxy/calbookings/${booking.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Annulé par le cabinet' }),
                      })
                      window.location.reload()
                    }}
                    className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {onEdit ? (
                <button
                  onClick={() => onEdit(booking)}
                  className="block text-left font-heading text-base font-semibold text-stone-800 transition-colors hover:text-primary-700"
                  title="Ouvrir le rendez-vous"
                >
                  {booking.attendeeName || 'Patient'}
                  {booking.title && <span className="ml-2 text-sm font-normal text-stone-600 hover:text-primary-700">{booking.title}</span>}
                </button>
              ) : (
                <>
                  <p className="font-heading text-base font-semibold text-stone-800">{booking.attendeeName || 'Patient'}</p>
                  {booking.title && <p className="text-sm text-stone-600">{booking.title}</p>}
                </>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-stone-600">
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
              <p className="mt-2 text-xs italic text-stone-600">Motif : {booking.cancellationReason}</p>
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
