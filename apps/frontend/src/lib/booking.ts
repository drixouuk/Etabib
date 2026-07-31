export type CalBooking = {
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
