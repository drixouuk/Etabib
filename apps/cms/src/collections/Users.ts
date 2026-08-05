import type { CollectionConfig } from 'payload'

// Clé interne serveur-à-serveur (même pattern que CalBookings/Tenants/Subscriptions) :
// utilisée par les routes frontend (demo approve / reset) pour gérer le compte démo.
function isInternalKey(req: any): boolean {
  const apiKey = req?.headers?.get?.('x-internal-api-key') || req?.headers?.['x-internal-api-key']
  return !!apiKey && apiKey === process.env.INTERNAL_BOOKING_API_KEY
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    useAPIKey: true,
    forgotPassword: {
      // Le lien pointe vers la page de reset du FRONTEND (qui appelle
      // /api/users/reset-password), pas vers l'admin Payload.
      generateEmailSubject: () => 'Etabib — Réinitialisation de votre mot de passe',
      generateEmailHTML: async ({ req, token, user }: any) => {
        const site = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'etabibi.ma'
        let domain: string | null = null
        const tid = user?.tenant && typeof user.tenant === 'object' ? user.tenant.id : user?.tenant
        if (tid) {
          const tenant = await req.payload
            .findByID({ collection: 'tenants', id: tid, depth: 0 })
            .catch(() => null)
          if (tenant?.domain) domain = tenant.domain
        }
        const base = domain ? `https://${domain}` : `https://${site}`
        const link = `${base}/fr/reinitialiser-mot-de-passe?token=${token}`
        return (
          `<p>Bonjour,</p>` +
          `<p>Une demande de réinitialisation de mot de passe a été faite pour votre compte.</p>` +
          `<p><a href="${link}">Définir un nouveau mot de passe</a></p>` +
          `<p>Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de la demande, ignorez cet email.</p>`
        )
      },
    },
  },
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: ({ req: { user }, data }: any): boolean => {
      if (!user) return false
      if ((user.roles as string[])?.includes('superadmin')) return true
      if (!(user.roles as string[])?.includes('tenant_admin')) return false

      const callerTenantId =
        typeof user.tenant === 'object' ? user.tenant.id : user.tenant
      const targetTenantId =
        typeof data?.tenant === 'object' ? data.tenant.id : data?.tenant

      return callerTenantId === targetTenantId
    },
    update: ({ req, id }: any) => {
      if (isInternalKey(req)) return true
      const user = req?.user
      const roles: string[] = user?.roles ?? []
      if (roles.includes('superadmin')) return true
      if (user?.id === id) return true
      if (roles.includes('tenant_admin')) {
        const tid = typeof user.tenant === 'object' ? user.tenant.id : user.tenant
        if (!tid) return false
        return { tenant: { equals: tid } }
      }
      return false
    },
    read: ({ req }: any) => {
      if (isInternalKey(req)) return true
      const user = req?.user
      if ((user?.roles as string[])?.includes('superadmin')) return true
      if (!user?.tenant) return false
      return {
        tenant: {
          equals:
            typeof user.tenant === 'object'
              ? (user.tenant as any).id
              : user.tenant,
        },
      }
    },
  },
  hooks: {
    beforeChange: [
      ({ req, data }: any) => {
        const user = req.user
        if (!user) return data

        const userRoles: string[] = user.roles ?? []
        const newRoles: string[] = data?.roles ?? []

        if (!userRoles.includes('superadmin') && newRoles.includes('superadmin')) {
          throw new Error('Seul un superadmin peut attribuer le rôle superadmin.')
        }
        if (
          !userRoles.includes('superadmin') &&
          !userRoles.includes('tenant_admin') &&
          newRoles.includes('tenant_admin')
        ) {
          throw new Error('Vous ne pouvez pas attribuer le rôle tenant_admin.')
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nom',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      options: ['superadmin', 'tenant_admin', 'doctor', 'secretary', 'substitute'],
      defaultValue: ['secretary'],
    },
    {
      name: 'doctorProfile',
      type: 'relationship',
      relationTo: 'doctors',
      label: 'Fiche médecin associée',
      admin: {
        description: 'Lie ce compte utilisateur à sa fiche Doctors (permet consultation par Dr. X, file par médecin, etc.)',
        condition: (data: any) => {
          const roles: string[] = data?.roles ?? []
          return roles.includes('doctor')
        },
      },
    },
    {
      name: 'accessExpiresAt',
      type: 'date',
      label: "Date d'expiration de l'accès",
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Pour les comptes remplaçants. Après cette date, la connexion est bloquée.',
        condition: (data: any) => {
          const roles: string[] = data?.roles ?? []
          return roles.includes('substitute')
        },
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      admin: {
        condition: (data: any): boolean =>
          !data?.roles?.includes('superadmin'),
      },
      validate: (value: unknown, { data }: { data?: any }): string | true => {
        const roles: string[] = data?.roles ?? []
        if (!roles.includes('superadmin') && !value) {
          return 'Le tenant est requis pour les utilisateurs non-superadmin.'
        }
        return true
      },
    },
  ],
}
