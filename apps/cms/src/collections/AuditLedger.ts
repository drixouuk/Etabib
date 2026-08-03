import type { CollectionConfig } from 'payload'
import { ledgerWrite } from '../hooks/auditLedger'

function tenantId(user: any): string | undefined {
  if (!user?.tenant) return undefined
  return typeof user.tenant === 'object' ? user.tenant.id : user.tenant
}

/**
 * Registre d'audit médical (Phase D — D1) — IMMUABLE.
 * - create : tout utilisateur authentifié (les hooks écrivent via payload.create)
 * - read : superadmin ou tenant concerné (lecture seule de l'historique)
 * - update / delete : TOUJOURS false — aucune ligne n'est modifiée ni supprimée ;
 *   une rectification est une nouvelle ligne `action: 'reversed'`
 * - beforeChange (create) : actor / tenant / occurredAt proviennent UNIQUEMENT
 *   du serveur (req.user / horloge), jamais du body
 * - idempotence : index unique partiel (entity, entity_id, action, dedup_key)
 *   WHERE dedup_key IS NOT NULL — événements rejouables (lectures fenêtrées)
 *   et rejoués ne créent pas de doublon
 */
export const AuditLedger: CollectionConfig = {
  slug: 'audit-ledger',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['occurredAt', 'action', 'entity', 'entityId'],
    group: 'Système',
    hidden: true, // écrit et lu par hooks/API, pas d'édition en admin
  },
  access: {
    create: ({ req }: any) => !!req.user,
    read: ({ req: { user } }: any) => {
      if (!user) return false
      const roles: string[] = user.roles ?? []
      if (roles.includes('superadmin')) return true
      const tid = tenantId(user)
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }: any) => {
        if (operation !== 'create') return data
        // Verrouillage serveur : ces trois valeurs ne viennent JAMAIS du body.
        data.actor = req.user?.id ?? null
        data.tenant = req.user?.tenant
          ? typeof req.user.tenant === 'object'
            ? req.user.tenant.id
            : req.user.tenant
          : null
        data.occurredAt = new Date().toISOString()
        return data
      },
    ],
  },
  fields: [
    { name: 'patient', type: 'relationship', relationTo: 'patients', label: 'Patient' },
    { name: 'actor', type: 'relationship', relationTo: 'users', label: 'Acteur', admin: { readOnly: true } },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', label: 'Tenant', admin: { readOnly: true } },
    { name: 'action', type: 'text', required: true, label: 'Action' },
    { name: 'entity', type: 'text', required: true, label: 'Entité' },
    { name: 'entityId', type: 'text', label: 'ID entité' },
    { name: 'detail', type: 'json', label: 'Détail (snapshot)' },
    {
      name: 'dedupKey',
      type: 'text',
      label: "Clé d'idempotence",
      admin: { description: 'Index unique partiel WHERE dedup_key IS NOT NULL' },
    },
    {
      name: 'occurredAt',
      type: 'date',
      label: 'Quand',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    // Index (dont l'index unique partiel WHERE dedup_key IS NOT NULL) :
    // migration 20260803_add_audit_ledger.ts — Payload 3.85 ne déclare pas
    // les index partiels dans la config (CompoundIndex = fields + unique).
  ],
  endpoints: [
    {
      // D1 — événement « exported » : appelé par la route d'export du frontend
      // (session via payload-token). Un export de dossier = une ligne ; un
      // export global = une ligne avec entityId 'bulk-export'.
      path: '/export-event',
      method: 'post',
      handler: async (req: any) => {
        const user = req.user
        if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 })
        const patientId = req.body?.patientId ?? null
        if (patientId != null && typeof patientId !== 'string' && typeof patientId !== 'number') {
          return Response.json({ error: 'patientId invalide' }, { status: 400 })
        }
        await ledgerWrite(req.payload, req, {
          patient: patientId ?? null,
          action: 'exported',
          entity: 'patient',
          entityId: patientId ?? 'bulk-export',
          detail: { exportedAt: new Date().toISOString() },
          dedupKey: null,
        })
        return Response.json({ ok: true })
      },
    },
  ],
}
