import type { CollectionConfig, Access } from 'payload'

// Pour les collections qui ont un champ tenant (Doctors, Services...),
// on filtre par ce champ. Pour Tenants lui-même (pas de champ tenant),
// on filtre par id à la place. Voir read ci-dessous.
const tenantAccess: Access = ({ req: { user } }) => {
  if (user?.roles?.includes('superadmin')) return true
  if (!user?.tenant) return false
  return {
    tenant: {
      equals: typeof user.tenant === 'object' ? user.tenant.id : user.tenant,
    },
  }
}

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    description: 'Cabinets médicaux (Multi-tenant)',
  },
  access: {
    create: ({ req: { user } }): boolean =>
      !!(user?.roles as string[])?.includes('superadmin'),
    // Lecture anonyme bloquée : seuls les utilisateurs authentifiés
    // (superadmin ou membre du tenant) peuvent voir leur propre tenant.
    // Les tenants n'ont PAS de champ "tenant" — on filtre par "id" à la place.
    // Le frontend (proxy.ts) utilise désormais /api/resolve-tenant?domain=...
    // qui est un endpoint public dédié, sans exposer la collection complète.
    read: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin')) return true
      if (!user?.tenant) return false
      const tid = user?.tenant ? (typeof user.tenant === 'object' ? user.tenant.id : user.tenant) : undefined
      if (!tid) return false
      return { id: { equals: tid } }
    },
    update: ({ req: { user }, id }: any): boolean => {
      if ((user?.roles as string[])?.includes('superadmin')) return true
      return (
        user?.tenant === id &&
        !!(user?.roles as string[])?.includes('tenant_admin')
      )
    },
    delete: ({ req: { user } }): boolean =>
      !!(user?.roles as string[])?.includes('superadmin'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom du Cabinet',
    },
    {
      name: 'domain',
      type: 'text',
      unique: true,
      label: 'Domaine personnalisé (ex: cabinet-aicha.etabibi.ma)',
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'defaultLocale',
          type: 'select',
          options: ['fr', 'ar', 'en', 'tzm'],
          defaultValue: 'fr',
        },
        {
          name: 'activeTier',
          type: 'select',
          options: ['vitrine', 'rdv', 'cabinet'],
          defaultValue: 'vitrine',
        },
        {
          name: 'specialty',
          type: 'select',
          options: ['pediatrie', 'generaliste', 'gynecologie', 'dermatologie', 'autre'],
          defaultValue: 'generaliste',
          label: 'Spécialité du cabinet',
          admin: { description: 'Détermine les modules cliniques affichés dans le dossier patient' },
        },
        {
          name: 'doctorCount',
          type: 'number',
          min: 1,
          defaultValue: 1,
          label: 'Nombre de médecins',
          admin: { description: 'Utilisé pour le calcul du prix du tier Cabinet' },
        },
        {
          name: 'maxSecretaryAccounts',
          type: 'number',
          label: 'Nombre max de secrétaires (optionnel)',
          admin: { description: 'Vide = illimité. Limite future sans re-développement.' },
        },
        {
          name: 'customSlots',
          type: 'checkbox',
          defaultValue: false,
          label: 'Créneaux de réservation différents des horaires',
          admin: { description: 'Si coché, le médecin peut éditer les créneaux indépendamment des horaires.' },
        },
        {
          name: 'defaultSlotDuration',
          type: 'number',
          defaultValue: 30,
          min: 15,
          max: 120,
          label: 'Durée par défaut des créneaux (min)',
          admin: { description: 'Utilisée lors de la génération automatique des créneaux depuis les horaires.' },
        },
        {
          name: 'defaultSlotBuffer',
          type: 'number',
          defaultValue: 15,
          min: 0,
          max: 60,
          label: 'Pause par défaut entre créneaux (min)',
          admin: { description: 'Utilisée lors de la génération automatique des créneaux depuis les horaires.' },
        },
        {
          name: 'calendarToken',
          type: 'text',
          admin: { readOnly: true, hidden: true },
          label: 'Token calendrier iCal',
        },
        {
          name: 'verificationToken',
          type: 'text',
          admin: { readOnly: true, hidden: true },
          label: 'Token de vérification email',
        },
        {
          name: 'emailVerified',
          type: 'checkbox',
          defaultValue: false,
          admin: { readOnly: true, hidden: true },
        },
      ],
    },
    {
      name: 'calcomSettings',
      type: 'group',
      label: 'Ancienne config Cal.com (obsolète — plus utilisé)',
      admin: { readOnly: true, hidden: true },
      fields: [
        {
          name: 'eventSlug',
          type: 'text',
        },
        {
          name: 'username',
          type: 'text',
        },
        {
          name: 'customUrl',
          type: 'text',
        },
      ],
    },
  ],
}
