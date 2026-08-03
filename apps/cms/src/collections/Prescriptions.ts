import type { CollectionConfig } from 'payload'
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
import { ledgerAfterChange } from '../hooks/auditLedger'

export const Prescriptions: CollectionConfig = {
  slug: 'prescriptions',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['patient', 'date', 'medications'],
    group: 'Dossier médical',
  },
  access: {
    read: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin')) return true
      if (!(roles.includes('tenant_admin') || roles.includes('doctor'))) return false
      return {
        tenant: {
          equals:
            typeof user.tenant === 'object' ? user.tenant.id : user.tenant,
        },
      }
    },
    create: ({ req: { user } }: any): boolean => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin')) return true
      if (!(roles.includes('tenant_admin') || roles.includes('doctor'))) return false
      return {
        tenant: {
          equals:
            typeof user.tenant === 'object' ? user.tenant.id : user.tenant,
        },
      }
    },
    delete: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin')) return true
      if (!(roles.includes('tenant_admin') || roles.includes('doctor'))) return false
      return {
        tenant: {
          equals:
            typeof user.tenant === 'object' ? user.tenant.id : user.tenant,
        },
      }
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
    afterRead: [auditReadHook('prescriptions')],
    afterChange: [auditWriteHook('prescriptions'), ledgerAfterChange('prescription')],
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'patient',
      type: 'relationship',
      relationTo: 'patients',
      required: true,
      index: true,
      label: 'Patient',
    },
    {
      name: 'consultation',
      type: 'relationship',
      relationTo: 'consultations' as any,
      label: 'Consultation associée',
    },
    {
      name: 'practitioner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Praticien',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Date',
    },
    {
      name: 'medications',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Médicaments',
      fields: [
        {
          name: 'nom',
          type: 'text',
          required: true,
          label: 'Nom du médicament',
        },
        {
          name: 'dci',
          type: 'text',
          label: 'DCI',
        },
        {
          name: 'posologie',
          type: 'text',
          required: true,
          label: 'Posologie',
        },
        {
          name: 'duree',
          type: 'text',
          required: true,
          label: 'Durée',
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes complémentaires',
    },
  ],
}
