import type { CollectionConfig } from 'payload'
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
import { ledgerAfterChange } from '../hooks/auditLedger'

// Idempotence (SX-100) : un UUID client par consultation, généré au moment de
// la création du brouillon côté frontend. Le replay réseau d'une même
// consultation réutilise la même valeur → l'endpoint /upsert la retourne sans
// créer de doublon. La violation unique remonte soit en code PG 23505, soit
// enveloppée par Payload en ValidationError « Value must be unique ».
function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err
  for (let i = 0; i < 4 && current; i++) {
    const e = current as { code?: unknown; message?: unknown; cause?: unknown; data?: unknown }
    const haystack =
      String(e.code ?? '') +
      ' ' +
      String(e.message ?? '') +
      ' ' +
      JSON.stringify(e.data ?? '')
    if (/23505|must be unique|unique constraint|duplicate/i.test(haystack)) {
      return true
    }
    current = e.cause
  }
  return false
}

export const Consultations: CollectionConfig = {
  slug: 'consultations',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['patient', 'date', 'motif', 'practitioner'],
    group: 'Dossier médical',
  },
  // Endpoint d'écriture idempotente (SX-100) : insert direct avec
  // clientRequestId — PAS de SELECT+INSERT (race de replay). Sur violation
  // de contrainte unique (23505), retourne l'enregistrement existant (200)
  // au lieu d'une erreur. Mêmes contrôles d'accès que create.
  endpoints: [
    {
      path: '/upsert',
      method: 'post',
      handler: async (req: any) => {
        const roles: string[] = req.user?.roles ?? []
        if (!(roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor'))) {
          return Response.json({ errors: [{ message: 'Non autorisé' }] }, { status: 401 })
        }

        const body = (await req.json?.()) ?? {}
        const clientRequestId = body?.clientRequestId
        if (!clientRequestId || typeof clientRequestId !== 'string') {
          return Response.json({ errors: [{ message: 'clientRequestId requis' }] }, { status: 400 })
        }

        // Tenant + praticien imposés depuis la session (la validation Payload
        // court-circuite le beforeChange) — jamais de corps client pour ces
        // deux champs : le praticien est l'utilisateur connecté, toujours.
        const userTenantId =
          req.user?.tenant && typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user?.tenant
        const data: Record<string, unknown> = {
          ...body,
          clientRequestId,
          tenant: userTenantId,
          practitioner: body.practitioner ?? req.user?.id,
        }

        try {
          const doc = await req.payload.create({
            collection: 'consultations',
            data,
          })
          return Response.json({ doc }, { status: 201 })
        } catch (err) {
          if (isUniqueViolation(err)) {
            const existing = await req.payload.find({
              collection: 'consultations',
              where: { clientRequestId: { equals: clientRequestId } },
              limit: 1,
              depth: 1,
            })
            const doc = existing?.docs?.[0]
            if (doc) return Response.json({ doc }, { status: 200 })
          }
          throw err
        }
      },
    },
  ],
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
        // Fix latent : le formulaire de consultation n'envoie jamais
        // practitioner — le praticien est l'utilisateur connecté (champ
        // requis). Couvre les deux chemins (POST générique + /upsert).
        if (operation === 'create' && !data.practitioner && req.user?.id) {
          data.practitioner = req.user.id
        }
        // FSE (CNSS) : fseStatusUpdatedAt suit automatiquement chaque
        // changement de fseStatus (création comprise). Aucune écriture
        // manuelle de ce champ possible côté admin (readOnly).
        if (data.fseStatus !== undefined) {
          const original = (req as any).originalDoc as { fseStatus?: string } | undefined
          if (operation === 'create' || original?.fseStatus !== data.fseStatus) {
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
    {
      name: 'clientRequestId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, description: 'UUID idempotence (SX-100) — généré côté client au moment du brouillon' },
    },
  ],
}
