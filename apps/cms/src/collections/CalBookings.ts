import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

export const CalBookings: CollectionConfig = {
  slug: 'calbookings',
  admin: {
    useAsTitle: 'bookingUid',
    defaultColumns: ['bookingUid', 'attendeeName', 'startTime', 'status', 'tenant'],
    group: 'Cabinet',
  },
  access: {
    read: ({ req }: any) => {
      const apiKey = req.headers?.get?.('x-internal-api-key') || req.headers?.['x-internal-api-key']
      if (apiKey && apiKey === process.env.INTERNAL_BOOKING_API_KEY) return true
      if (req.user?.roles?.includes('superadmin')) return true
      const tid = req.user?.tenant ? (typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant) : undefined
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    create: ({ req }: any) => {
      const apiKey = req.headers?.get?.('x-internal-api-key') || req.headers?.['x-internal-api-key']
      if (apiKey && apiKey === process.env.INTERNAL_BOOKING_API_KEY) return true
      const roles = req.user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor') || roles.includes('secretary')
    },
    update: ({ req: { user } }: any) => {
      if (user?.roles?.includes('superadmin')) return true
      const tid = user?.tenant ? (typeof user.tenant === 'object' ? user.tenant.id : user.tenant) : undefined
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    delete: ({ req: { user } }: any) => {
      if (user?.roles?.includes('superadmin')) return true
      const tid = user?.tenant ? (typeof user.tenant === 'object' ? user.tenant.id : user.tenant) : undefined
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
  },
  hooks: {
    beforeChange: [
      async ({ req, data, operation, id }: any) => {
        if (req.user?.tenant) {
          data.tenant = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        }
        if (data.tenant && data.startTime && data.status !== 'cancelled') {
          const where: Record<string, unknown> = {
            tenant: { equals: typeof data.tenant === 'object' ? data.tenant.id : data.tenant },
            startTime: { equals: data.startTime },
            status: { not_equals: 'cancelled' },
          }
          if (operation === 'update' && id) where.id = { not_equals: id }
          const existing = await req.payload.find({
            collection: 'calbookings',
            where,
            depth: 0,
            limit: 1,
          })
          if (existing.docs.length > 0) {
            throw new APIError('Ce créneau est déjà réservé.', 409, null, true)
          }
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'bookingUid', type: 'text', unique: true, required: true, label: 'UID Cal.com' },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, admin: { readOnly: true } },
    { name: 'eventTypeSlug', type: 'text', required: true, label: 'Slug événement' },
    { name: 'title', type: 'text', label: 'Titre' },
    { name: 'status', type: 'select', options: [
      { label: 'Confirmé', value: 'accepted' },
      { label: 'En attente', value: 'pending' },
      { label: 'Annulé', value: 'cancelled' },
      { label: 'Refusé', value: 'rejected' },
    ], label: 'Statut' },
    { name: 'startTime', type: 'date', required: true, label: 'Début', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'endTime', type: 'date', required: true, label: 'Fin', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'attendeeName', type: 'text', label: 'Patient' },
    { name: 'attendeeEmail', type: 'text', label: 'Email patient' },
    { name: 'attendeePhone', type: 'text', label: 'Téléphone patient' },
    { name: 'attendeeTimezone', type: 'text', label: 'Fuseau horaire' },
    { name: 'location', type: 'text', label: 'Lien visio / lieu' },
    { name: 'duration', type: 'number', label: 'Durée (minutes)' },
    { name: 'rescheduledFromUid', type: 'text', label: 'Reschedulé depuis UID' },
    { name: 'rescheduledToUid', type: 'text', label: 'Reschedulé vers UID' },
    { name: 'cancellationReason', type: 'textarea', label: 'Motif annulation' },
    { name: 'responses', type: 'json', label: 'Réponses formulaire' },
  ],
}
