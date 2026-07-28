import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import BookingListView from '@/components/dashboard/BookingListView'
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

export default async function RendezVousPage() {
  const user = await requireAuth()
  const tenantId = getTenantId(user)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const data = await fetchCMS<{ docs: CalBooking[] }>(
    `/api/calbookings?where[tenant][equals]=${tenantId}&where[startTime][greater_than_equal]=${today.toISOString()}&where[startTime][less_than]=${tomorrow.toISOString()}&sort=startTime&depth=0&limit=100`,
    { revalidate: 0 },
  )
  const bookings = data?.docs ?? []

  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-stone-800">Rendez-vous</h1>
      <p className="mt-1 text-sm text-stone-800-soft capitalize">{dateLabel}</p>
      <div className="mt-6">
        <BookingListView bookings={bookings} />
      </div>
    </div>
  )
}
