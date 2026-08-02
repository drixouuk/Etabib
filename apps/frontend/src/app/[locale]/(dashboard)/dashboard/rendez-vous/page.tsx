import { requireTier } from '@/lib/tier-guard'
import { fetchCMS } from '@/lib/cms-fetch'
import type { CalBooking } from '@/lib/booking'
import RendezVousCalendarClient from '@/components/dashboard/RendezVousCalendarClient'
import { formatDateMorocco } from '@/lib/datetime'
import { Calendar } from 'lucide-react'

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
  const { user, tenantId } = await requireTier(['rdv', 'cabinet'])

  let bookings: CalBooking[] = []
  let renderError: string | null = null

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const pastStart = new Date(today)
    pastStart.setDate(pastStart.getDate() - 7)
    const futureEnd = new Date(today)
    futureEnd.setDate(futureEnd.getDate() + 7)

    const data = await fetchCMS<{ docs: CalBooking[] }>(
      `/api/calbookings?where[tenant][equals]=${tenantId}&where[startTime][greater_than_equal]=${pastStart.toISOString()}&where[startTime][less_than]=${futureEnd.toISOString()}&sort=startTime&depth=0&limit=200`,
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

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <RendezVousCalendarClient tenantId={tenantId} initialBookings={bookings} />
    </div>
  )
}
