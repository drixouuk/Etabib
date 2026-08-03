import type { CollectionConfig } from 'payload'
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
import { ledgerAfterChange } from '../hooks/auditLedger'

export const Consultations: CollectionConfig = {
  slug: 'consultations',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['patient', 'date', 'motif', 'practitioner'],
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
    afterRead: [auditReadHook('consultations')],
    afterChange: [auditWriteHook('consultations'), ledgerAfterChange('consultation')],
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
      name: 'motif',
      type: 'text',
      label: 'Motif',
    },
    {
      name: 'examenClinique',
      type: 'textarea',
      label: 'Examen clinique',
    },
    {
      name: 'poids',
      type: 'number',
      label: 'Poids (kg)',
    },
    {
      name: 'taille',
      type: 'number',
      label: 'Taille (cm)',
    },
    {
      name: 'perimetreCranien',
      type: 'number',
      label: 'Périmètre crânien (cm)',
    },
    {
      name: 'diagnostic',
      type: 'textarea',
      label: 'Diagnostic',
    },
    {
      name: 'codeActe',
      type: 'text',
      label: 'Code acte (NGAP) — optionnel, préparation future',
    },
  ],
}
