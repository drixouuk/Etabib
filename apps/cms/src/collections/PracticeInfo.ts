import type { CollectionConfig, Field, Access } from 'payload'

const tenantAccess: Access = ({ req: { user } }) => {
  if (user?.roles?.includes('superadmin')) return true
  if (!user?.tenant) return false
  return {
    tenant: {
      equals: typeof user.tenant === 'object' ? user.tenant.id : user.tenant,
    },
  }
}

const tenantField: Field = {
  name: 'tenant',
  type: 'relationship',
  relationTo: 'tenants',
  required: true,
  admin: {
    position: 'sidebar',
    condition: (_data: any, _siblingData: any, { user }: any): boolean =>
      !!(user?.roles as string[])?.includes('superadmin'),
  },
  hooks: {
    beforeChange: [
      ({ req, operation, value }) => {
        if (
          operation === 'create' &&
          req.user &&
          !req.user.roles?.includes('superadmin')
        ) {
          return req.user.tenant
        }
        return value
      },
    ],
  },
}

export const PracticeInfo: CollectionConfig = {
  slug: 'practice-info',
  admin: {
    useAsTitle: 'id',
    group: 'Contenu',
  },
  access: {
    read: () => true,
    create: tenantAccess,
    update: tenantAccess,
    delete: tenantAccess,
  },
  fields: [
    tenantField,
    {
      name: 'address',
      type: 'textarea',
      localized: true,
      label: 'Adresse',
    },
    {
      name: 'city',
      type: 'text',
      localized: true,
      label: 'Ville',
    },
    {
      name: 'tagline',
      type: 'text',
      localized: true,
      label: 'Slogan (hero)',
    },
    {
      name: 'hoursNote',
      type: 'text',
      localized: true,
      label: 'Remarque horaires',
    },
    {
      name: 'paymentNote',
      type: 'text',
      localized: true,
      label: 'Note paiement',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Téléphone',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
    },
    {
      type: 'group',
      name: 'coordinates',
      label: 'Coordonnées GPS',
      fields: [
        {
          name: 'lat',
          type: 'number',
          label: 'Latitude',
          admin: { placeholder: '30.3576702' },
        },
        {
          name: 'lng',
          type: 'number',
          label: 'Longitude',
          admin: { placeholder: '-9.5279038' },
        },
      ],
    },
    {
      name: 'schedules',
      type: 'array',
      label: 'Horaires',
      fields: [
        {
          name: 'dayOfWeek',
          type: 'number',
          required: true,
          min: 1,
          max: 7,
          label: 'Jour (1=Lundi … 7=Dimanche)',
        },
        {
          name: 'open',
          type: 'text',
          label: 'Ouverture',
          admin: { placeholder: '08:30' },
        },
        {
          name: 'close',
          type: 'text',
          label: 'Fermeture',
          admin: { placeholder: '16:30' },
        },
      ],
    },
    {
      name: 'exceptionalClosures',
      type: 'array',
      label: 'Fermetures exceptionnelles',
      fields: [
        {
          name: 'startDate',
          type: 'date',
          required: true,
          label: 'Du',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'endDate',
          type: 'date',
          label: 'Au',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Motif (ex: Congés annuels)',
        },
      ],
    },
    {
      name: 'pricing',
      type: 'richText',
      localized: true,
      label: 'Tarifs',
    },
  ],
}
