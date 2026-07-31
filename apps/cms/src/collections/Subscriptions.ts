import type { CollectionConfig } from 'payload'

function tenantId(user: any): string | undefined {
  if (!user?.tenant) return undefined
  return typeof user.tenant === 'object' ? user.tenant.id : user.tenant
}

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'grace',
  'suspended',
  'expired',
  'canceled',
] as const

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'tenant',
    defaultColumns: ['tenant', 'plan', 'status', 'currentPeriodEnd', 'amount'],
    group: 'Cabinet',
  },
  access: {
    read: ({ req }: any) => {
      const apiKey = req.headers?.get?.('x-internal-api-key') || req.headers?.['x-internal-api-key']
      if (apiKey && apiKey === process.env.INTERNAL_BOOKING_API_KEY) return true
      if (req.user?.roles?.includes('superadmin')) return true
      const tid = tenantId(req.user)
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    create: ({ req }: any) => {
      const apiKey = req.headers?.get?.('x-internal-api-key') || req.headers?.['x-internal-api-key']
      if (apiKey && apiKey === process.env.INTERNAL_BOOKING_API_KEY) return true
      return !!req.user?.roles?.includes('superadmin')
    },
    update: ({ req }: any) => {
      const apiKey = req.headers?.get?.('x-internal-api-key') || req.headers?.['x-internal-api-key']
      if (apiKey && apiKey === process.env.INTERNAL_BOOKING_API_KEY) return true
      return !!req.user?.roles?.includes('superadmin')
    },
    delete: ({ req: { user } }: any) => !!user?.roles?.includes('superadmin'),
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    {
      name: 'plan',
      type: 'select',
      required: true,
      options: [
        { label: 'Vitrine', value: 'vitrine' },
        { label: 'RDV', value: 'rdv' },
        { label: 'Cabinet', value: 'cabinet' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'trialing',
      options: SUBSCRIPTION_STATUSES.map(s => ({ label: s, value: s })),
    },
    { name: 'currentPeriodStart', type: 'date', label: 'Début de cycle' },
    { name: 'currentPeriodEnd', type: 'date', label: 'Fin de cycle' },
    { name: 'seats', type: 'number', defaultValue: 1, label: 'Nombre de médecins' },
    { name: 'amount', type: 'number', defaultValue: 0, label: 'Montant mensuel (MAD)' },
    { name: 'billingEmail', type: 'text', label: 'Email de facturation' },
    { name: 'lastPaymentAt', type: 'date', label: 'Dernier paiement' },
    { name: 'providerId', type: 'text', label: 'Référence prestataire (CMI…)' },
    { name: 'lastReminderAt', type: 'date', label: 'Dernière relance envoyée' },
    { name: 'notes', type: 'textarea', label: 'Notes internes (appels, dunning)' },
  ],
}
