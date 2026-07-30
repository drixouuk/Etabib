import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import RendezVousCalendarClient from '@/components/dashboard/RendezVousCalendarClient'
import BookingListView from '@/components/dashboard/BookingListView'
import { formatDateMorocco } from '@/lib/datetime'
import { Calendar } from 'lucide-react'

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

function ErrorState({ message }: { message: string }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateLabel = formatDateMorocco(today.toISOString())

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-stone-800">Rendez-vous</h1>
      <p className="mt-1 text-sm text-stone-600 capitalize">{dateLabel}</p>
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-warm bg-white py-16 text-center shadow-sm">
        <Calendar className="size-12 text-stone-300" />
        <h2 className="mt-4 font-heading text-lg font-semibold text-stone-800">Service temporairement indisponible</h2>
        <p className="mt-2 max-w-md text-sm text-stone-600">
          Impossible de charger les rendez-vous. Veuillez réessayer dans quelques instants.
        </p>
        <p className="mt-1 text-xs text-stone-400">{message}</p>
        <a
          href="/dashboard/rendez-vous"
          className="mt-6 rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-800"
        >
          Réessayer
        </a>
      </div>
    </div>
  )
}

export default async function RendezVousPage() {
  const user = await requireAuth()
  const tenantId = getTenantId(user)

  if (!tenantId) {
    return <ErrorState message="Tenant introuvable pour cet utilisateur" />
  }

  let bookings: CalBooking[] = []
  let renderError: string | null = null

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const data = await fetchCMS<{ docs: CalBooking[] }>(
      `/api/calbookings?where[tenant][equals]=${tenantId}&where[startTime][greater_than_equal]=${today.toISOString()}&where[startTime][less_than]=${tomorrow.toISOString()}&sort=startTime&depth=0&limit=100`,
      { revalidate: 0 },
    )
    bookings = data?.docs ?? []
  } catch (e) {
    console.error('[rendez-vous] fetch error:', e)
    renderError = e instanceof Error ? e.message : 'Erreur inconnue'
  }

  if (renderError) {
    return <ErrorState message={renderError} />
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateLabel = formatDateMorocco(today.toISOString())

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-stone-800">Rendez-vous</h1>
      <p className="mt-1 text-sm text-stone-600 capitalize">{dateLabel}</p>
      <div className="mt-6">
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <RendezVousCalendarClient
            initialBookings={bookings.map(b => ({
              id: b.id,
              title: b.title,
              startTime: b.startTime,
              endTime: b.endTime,
              attendeeName: b.attendeeName,
            }))}
          />
        </div>
        <BookingListView bookings={bookings} />
      </div>
    </div>
  )
}
