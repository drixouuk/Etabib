import type { CollectionConfig } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
import { ledgerRead } from '../hooks/auditLedger'

function tenantId(user: any): string | undefined {
  if (!user?.tenant) return undefined
  return typeof user.tenant === 'object' ? user.tenant.id : user.tenant
}

/**
 * B5 — recherche patients diacritic-insensitive (unaccent + pg_trgm).
 * Endpoint GET /api/patients/search?q=… :
 *   - folding des accents : « elodie » trouve « Élodie » (harakat arabes inclus)
 *   - index trigramme + ORDER BY similarity → tolérance aux fautes
 *   - garde-fous : q ≤ 60 caractères, wildcards LIKE (% _ \) neutralisés,
 *     LIMIT 10, scoping tenant identique aux accès de la collection
 *     (les médecins ne voient que leurs dossiers suivis/partagés/orphelins).
 */
const PATIENT_SEARCH_SQL = (q: string, tid: string | undefined, uid: string, isDoctor: boolean) => {
  const like = `%${q}%`
  const doctorScope = isDoctor
    ? sql`
        AND (
          EXISTS (SELECT 1 FROM "patients_rels" r  WHERE r."_parent_id" = p."id" AND r."path" = 'followedBy' AND r."users_id" = ${uid})
          OR EXISTS (SELECT 1 FROM "patients_rels" r2 WHERE r2."_parent_id" = p."id" AND r2."path" = 'sharedWith' AND r2."users_id" = ${uid})
          OR (NOT EXISTS (SELECT 1 FROM "patients_rels" r3 WHERE r3."_parent_id" = p."id" AND r3."path" = 'followedBy')
              AND NOT EXISTS (SELECT 1 FROM "patients_rels" r4 WHERE r4."_parent_id" = p."id" AND r4."path" = 'sharedWith'))
        )`
    : sql``
  return sql`
    SELECT p."id",
           p."full_name" AS "fullName",
           p."gender",
           p."birth_date" AS "birthDate",
           p."national_id" AS "nationalId",
           p."tenant_id" AS "tenantId"
    FROM "patients" p
    WHERE (public.f_unaccent(p."full_name") ILIKE public.f_unaccent(${like})
           OR (p."national_id" IS NOT NULL AND public.f_unaccent(p."national_id") ILIKE public.f_unaccent(${like})))
      AND (${tid ? sql`p."tenant_id" = ${Number(tid)}` : sql`TRUE`})
      ${doctorScope}
    ORDER BY similarity(public.f_unaccent(p."full_name"), public.f_unaccent(${q})) DESC, p."full_name" ASC
    LIMIT 10
  `
}

export const Patients: CollectionConfig = {
  slug: 'patients',
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'gender', 'nationalId', 'updatedAt'],
  },
  access: {
    read: ({ req: { user } }: any) => {
      if (!user) return false
      const roles: string[] = user.roles ?? []
      if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
      const tid = tenantId(user)
      if (!tid) return false
      if (roles.includes('doctor')) {
        const filter: any = {
          and: [
            { tenant: { equals: tid } },
            {
              or: [
                { followedBy: { in: [user.id] } },
                { sharedWith: { in: [user.id] } },
                { and: [{ followedBy: { exists: false } }, { sharedWith: { exists: false } }] },
              ],
            },
          ],
        }
        return filter
      }
      return { tenant: { equals: tid } }
    },
    create: ({ req: { user } }: any): boolean => {
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
      if (roles.includes('doctor')) return !!tenantId(user)
      return false
    },
    update: ({ req: { user } }: any) => {
      const tid = tenantId(user)
      if (!tid) return false
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
      if (roles.includes('doctor')) {
        const filter: any = {
          and: [
            { tenant: { equals: tid } },
            {
              or: [
                { followedBy: { in: [user.id] } },
                { sharedWith: { in: [user.id] } },
                { and: [{ followedBy: { exists: false } }, { sharedWith: { exists: false } }] },
              ],
            },
          ],
        }
        return filter
      }
      return false
    },
    delete: ({ req: { user } }: any) => {
      const tid = tenantId(user)
      if (!tid) return false
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
      if (roles.includes('doctor')) {
        const filter: any = {
          and: [
            { tenant: { equals: tid } },
            {
              or: [
                { followedBy: { in: [user.id] } },
                { and: [{ followedBy: { exists: false } }, { sharedWith: { exists: false } }] },
              ],
            },
          ],
        }
        return filter
      }
      return false
    },
  },
  hooks: {
    afterRead: [auditReadHook('patients'), ledgerRead('patient', (d) => d.id)],
    afterChange: [auditWriteHook('patients')],
    beforeChange: [
      ({ req, data, operation }: any) => {
        if (operation === 'create' && req.user?.tenant) {
          data.tenant = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        }
        if (operation === 'create' && req.user && (!data?.followedBy || data.followedBy.length === 0)) {
          data.followedBy = [req.user.id]
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'healthIdentifier',
      type: 'text',
      label: 'Identifiant santé unique (CNSS) — à connecter plus tard',
    },
    // Bloc CNSS/AMO (roadmap FSE/DMP) — champs optionnels, aucune contrainte
    // de format stricte (la CNSS n'a pas publié de format canonique unique) :
    // le numéro d'immatriculation sera la clé de référence de la future FSE
    // et du DMP. `cnssCardUploadedAt` trace l'upload de carte (OCR futur).
    {
      name: 'cnssRegistrationNumber',
      type: 'text',
      label: "Numéro d'immatriculation CNSS/AMO",
      admin: { description: 'Numéro figurant sur la carte d\u2019affiliation — nécessaire pour la feuille de soins électronique (FSE) et le futur dossier patient partagé (DMP).' },
    },
    {
      name: 'cnssRegime',
      type: 'select',
      options: [
        { label: 'Indépendant', value: 'independant' },
        { label: 'Salarié', value: 'salarie' },
        { label: 'Ayant droit', value: 'ayant_droit' },
        { label: 'Étudiant', value: 'etudiant' },
      ],
      label: 'Régime CNSS/AMO',
      admin: { description: 'Anticipe la logique de remboursement différenciée par régime.' },
    },
    {
      name: 'cnssCardUploadedAt',
      type: 'date',
      label: 'Carte CNSS uploadée le',
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Traçabilité de l\u2019upload de la carte d\u2019affiliation (OCR à venir).' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'fullName',
      type: 'text',
      required: true,
    },
    {
      name: 'gender',
      type: 'select',
      required: true,
      options: [
        { label: 'Garçon', value: 'boy' },
        { label: 'Fille', value: 'girl' },
      ],
      label: 'Sexe',
    },
    {
      name: 'birthDate',
      type: 'date',
      label: 'Date de naissance',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'address',
      type: 'text',
      label: 'Adresse',
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
      name: 'nationalId',
      type: 'text',
    },
    {
      name: 'antecedents',
      type: 'textarea',
      label: 'Antécédents médicaux',
      access: {
        read: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
        update: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
      },
    },
    {
      name: 'allergies',
      type: 'textarea',
      label: 'Allergies connues',
      access: {
        read: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
        update: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
      },
    },
    {
      name: 'traitementsEnCours',
      type: 'textarea',
      label: 'Traitements en cours',
      access: {
        read: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
        update: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
      },
    },
    {
      name: 'medicalNotes',
      type: 'textarea',
      // Accès réservé à superadmin / tenant_admin / doctor.
      // tenant_admin inclus par défaut mais peut être retiré si
      // seuls les médecins doivent voir les notes médicales.
      access: {
        read: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
        update: ({ req: { user } }: any) => {
          const roles: string[] = user?.roles ?? []
          return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
        },
      },
    },
    {
      name: 'patientSource',
      type: 'select',
      options: [
        { label: 'Médecin référent', value: 'referring_practitioner' },
        { label: 'Google', value: 'google' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'Recommandé par un autre patient', value: 'autre_patient' },
        { label: 'Connaissance / Bouche-à-oreille', value: 'connaissance' },
        { label: 'Professionnel de santé', value: 'professionnel_sante' },
        { label: 'Autre', value: 'autre' },
      ],
      label: 'Provenance du patient',
      admin: { description: 'Comment le patient a-t-il connu le cabinet ?' },
    },
    {
      name: 'patientSourceDetail',
      type: 'text',
      label: 'Détail de la provenance',
      admin: { description: 'Nom du médecin, nom du patient référent, groupe Facebook, etc.' },
    },
    {
      name: 'referringPractitioners',
      type: 'relationship',
      relationTo: 'referring-practitioners',
      hasMany: true,
      label: 'Médecins référents',
      admin: { description: 'Praticiens ayant adressé ce patient' },
    },
    {
      name: 'followedBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Suivi par',
      admin: { description: 'Médecins responsables du suivi de ce patient' },
    },
    {
      name: 'sharedWith',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Partagé avec',
      admin: { description: 'Médecins ayant reçu un accès ponctuel à ce dossier' },
    },
  ],
  endpoints: [
    {
      path: '/search',
      method: 'get',
      handler: async (req: any) => {
        const { user } = req
        if (!user) return Response.json({ docs: [] }, { status: 401 })

        const raw = String(req.query?.q ?? '').trim()
        const q = raw.slice(0, 60)
        if (!q) return Response.json({ docs: [] })

        const roles: string[] = user.roles ?? []
        const tid = tenantId(user)
        // Garde-fou serveur : les wildcards LIKE passés par l'utilisateur ne
        // doivent pas devenir des jokers dans ILIKE.
        const safe = q.replace(/[%_\\]/g, ' ')
        if (!safe.trim()) return Response.json({ docs: [] })

        const isDoctor = roles.includes('doctor') && !roles.includes('superadmin') && !roles.includes('tenant_admin')
        try {
          const result = await req.payload.db.execute(PATIENT_SEARCH_SQL(safe, tid, String(user.id), isDoctor))
          return Response.json({ docs: result.rows ?? [] })
        } catch (err) {
          req.payload.logger?.error?.('[patients/search]', err)
          return Response.json({ docs: [] }, { status: 500 })
        }
      },
    },
  ],
}
