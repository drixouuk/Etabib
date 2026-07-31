import { fetchCMS } from '@/lib/cms-fetch'
import { calculateCabinetPrice } from '@/lib/pricing'

export const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'grace', 'suspended', 'expired', 'canceled'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export type Subscription = {
  id: string
  tenant: string | { id: string; name?: string; domain?: string; email?: string }
  plan: 'vitrine' | 'rdv' | 'cabinet'
  status: SubscriptionStatus
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  seats?: number | null
  amount?: number | null
  billingEmail?: string | null
  lastPaymentAt?: string | null
  providerId?: string | null
  lastReminderAt?: string | null
  notes?: string | null
}

// Durées du cycle de facturation (jours)
export const TRIAL_DAYS = 14 // essai gratuit cabinet
export const PERIOD_DAYS = 30 // cycle mensuel
export const PAST_DUE_GRACE_DAYS = 14 // past_due → grace (J+14, lecture seule)
export const GRACE_SUSPEND_DAYS = 16 // grace → suspended (J+30)
export const SUSPEND_EXPIRE_DAYS = 180 // suspended → expired (données conservées)

export const BLOCKED_STATUSES: SubscriptionStatus[] = ['suspended', 'expired']
export const READONLY_STATUSES: SubscriptionStatus[] = ['grace']

export function isBlocked(status?: SubscriptionStatus | null): boolean {
  return !!status && BLOCKED_STATUSES.includes(status)
}

export function isReadOnly(status?: SubscriptionStatus | null): boolean {
  return !!status && READONLY_STATUSES.includes(status)
}

// Écritures autorisées : trialing, active, past_due, canceled (fallback vitrine)
export function isWritable(status?: SubscriptionStatus | null): boolean {
  return !isBlocked(status) && !isReadOnly(status)
}

export function computeAmount(plan: string, seats: number): number {
  if (plan === 'cabinet') return calculateCabinetPrice(Math.max(1, seats))
  if (plan === 'rdv') return 199
  return 0
}

// Subscription du tenant, via le cookie de session (côté serveur)
export async function getSubscriptionByTenant(tenantId: string): Promise<Subscription | null> {
  const data = await fetchCMS<{ docs: Subscription[] }>(
    `/api/subscriptions?where[tenant][equals]=${encodeURIComponent(tenantId)}&depth=0&limit=1`,
  )
  return data?.docs?.[0] ?? null
}

// Statut de paiement du tenant de l'utilisateur courant (côté serveur)
// Retourne null si pas de session, pas de tenant (superadmin global) ou pas de subscription (legacy = actif)
export async function getCurrentSubscription(): Promise<Subscription | null> {
  const me = await fetchCMS<{ user: { tenant?: string | { id: string } } | null }>('/api/users/me', { revalidate: 0 })
  const tenant = me?.user?.tenant
  if (!tenant) return null
  const tenantId = typeof tenant === 'object' ? tenant.id : tenant
  if (!tenantId) return null
  return getSubscriptionByTenant(tenantId)
}

// Garde d'écriture pour les routes mutantes (cms-proxy, /api/bookings…) :
// trialing/active/past_due → autorisé ; grace → lecture seule ; suspended/expired → bloqué.
// Absence de subscription (legacy) ou superadmin hors tenant → autorisé.
export async function requireWritable(): Promise<{ ok: boolean; status?: SubscriptionStatus | null }> {
  const subscription = await getCurrentSubscription()
  if (!subscription) return { ok: true, status: null }
  if (isWritable(subscription.status)) return { ok: true, status: subscription.status }
  return { ok: false, status: subscription.status }
}
