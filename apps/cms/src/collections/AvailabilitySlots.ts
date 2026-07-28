import type { CollectionConfig } from 'payload'

export const AvailabilitySlots: CollectionConfig = {
  slug: 'availability-slots',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['doctor', 'dayOfWeek', 'startTime', 'endTime'],
    group: 'Cabinet',
  },
  access: {
    read: ({ req: { user } }: any) => {
      if (user?.roles?.includes('superadmin')) return true
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    create: ({ req: { user } }: any): boolean => {
      const roles = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    delete: ({ req: { user } }: any) => {
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }: any) => {
        if (operation === 'create' && req.user?.tenant) {
          data.tenant = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, admin: { readOnly: true } },
    {
      name: 'doctor',
      type: 'relationship',
      relationTo: 'doctors',
      label: 'Médecin (optionnel, pour tier clinique)',
    },
    {
      name: 'dayOfWeek',
      type: 'select',
      required: true,
      options: [
        { label: 'Lundi', value: '1' },
        { label: 'Mardi', value: '2' },
        { label: 'Mercredi', value: '3' },
        { label: 'Jeudi', value: '4' },
        { label: 'Vendredi', value: '5' },
        { label: 'Samedi', value: '6' },
        { label: 'Dimanche', value: '0' },
      ],
      label: 'Jour',
    },
    { name: 'startTime', type: 'text', required: true, label: 'Début (HH:MM)' },
    { name: 'endTime', type: 'text', required: true, label: 'Fin (HH:MM)' },
    { name: 'durationMinutes', type: 'number', required: true, label: 'Durée consultation (min)', defaultValue: 30, min: 15, max: 120 },
    { name: 'bufferMinutes', type: 'number', label: 'Pause entre RDV (min)', defaultValue: 15, min: 0, max: 60 },
    { name: 'isActive', type: 'checkbox', label: 'Actif', defaultValue: true },
  ],
}
