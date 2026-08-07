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
      ({ req, data, operation, originalDoc }: any) => {
        if (operation === 'create' && req.user?.tenant) {
          data.tenant = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        }
        // Fix latent : le formulaire de consultation n'envoie jamais
        // practitioner — le praticien est l'utilisateur connecté (champ
        // requis).
        if (operation === 'create' && !data.practitioner && req.user?.id) {
          data.practitioner = req.user.id
        }
        // FSE (CNSS) : fseStatusUpdatedAt suit automatiquement chaque
        // changement de fseStatus (création comprise). Aucune écriture
        // manuelle de ce champ possible côté admin (readOnly).
        // originalDoc est un argument du hook (pas req.originalDoc) —
        // sinon la condition est toujours vraie et le champ se met à jour
        // à chaque sauvegarde touchant fseStatus, pas au vrai changement.
        if (data.fseStatus !== undefined) {
          if (operation === 'create' || originalDoc?.fseStatus !== data.fseStatus) {
            data.fseStatusUpdatedAt = new Date().toISOString()
          }
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
    // Suivi FSE (CNSS) — déclaratif : le statut est mis à jour manuellement
    // après retour CNSS (aucune API CNSS disponible). Suivi interne, pas une
    // source de vérité CNSS.
    {
      name: 'fseStatus',
      type: 'select',
      options: [
        { label: 'Non envoyée', value: 'non_envoyee' },
        { label: 'Envoyée', value: 'envoyee' },
        { label: 'Acceptée', value: 'acceptee' },
        { label: 'Remboursée', value: 'remboursee' },
        { label: 'Rejetée', value: 'rejetee' },
      ],
      defaultValue: 'non_envoyee',
      label: 'Statut FSE',
      admin: { description: 'Mise à jour manuelle après retour CNSS — suivi interne.' },
    },
    {
      name: 'fseSentAt',
      type: 'date',
      label: 'FSE envoyée le',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Date d\u2019envoi — base de l\u2019alerte de délai anormal.' },
    },
    {
      name: 'fseStatusUpdatedAt',
      type: 'date',
      label: 'Statut FSE mis à jour le',
      admin: { readOnly: true, date: { pickerAppearance: 'dayOnly' } },
    },
  ],
}
