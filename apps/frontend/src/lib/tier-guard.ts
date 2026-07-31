import { requireAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { getTenantById } from '@/lib/payload'
import { redirect } from 'next/navigation'
import { getSubscriptionByTenant, isBlocked, type Subscription } from '@/lib/subscription'

export async function requireTier(allowed: string[]) {
  const user = await requireAuth()
  const tenantId = getTenantId(user)
  if (!tenantId) redirect('/')
  const tenant = await getTenantById(tenantId)
  const tier = tenant?.settings?.activeTier
  if (!tier || !allowed.includes(tier)) redirect('/dashboard/settings')

  // Facturation : tenant sans subscription = legacy, considéré actif.
  // suspended/expired → page Abonnement (le tier fonctionnel reste la source des features).
  let subscription: Subscription | null = null
  if (tenantId) {
    subscription = await getSubscriptionByTenant(tenantId)
    if (subscription && isBlocked(subscription.status)) redirect('/dashboard/billing')
  }

  return { user, tenant, tenantId, tier, subscription }
}

const STAFF_ROLES = ['doctor', 'tenant_admin', 'superadmin', 'substitute']

// Secrétaire stricte (sans rôle médecin/admin) : périmètre réduit à la file
// d'attente et aux rendez-vous. Les pages hors périmètre la redirigent.
export function isSecretaryOnly(user: { roles?: string[] }): boolean {
  const roles = user.roles ?? []
  return roles.includes('secretary') && !roles.some((r) => STAFF_ROLES.includes(r))
}
