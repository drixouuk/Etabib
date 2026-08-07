import { requireAuth } from '@/lib/auth'
import type { Subscription } from '@/lib/subscription'
import BillingAdminTable, { type BillingRow } from '@/components/dashboard/BillingAdminTable'
import { fetchCMS } from '@/lib/cms-fetch'

export default async function BillingAdminPage() {
  const user = await requireAuth()
  if (!user.roles?.includes('superadmin')) {
    return (
      <div className="mx-auto max-w-container px-4 py-8 md:px-6 lg:px-8">
        <p className="text-stone-600">Accès réservé aux administrateurs de la plateforme.</p>
      </div>
    )
  }

  const data = await fetchCMS<{ docs: Subscription[] }>(
    '/api/subscriptions?where[status][in]=trialing,past_due,grace,suspended,expired,canceled&depth=1&limit=200&sort=currentPeriodEnd',
  )
  const STATUS_LABELS: Record<string, string> = {
    trialing: 'Essai', active: 'Actif', past_due: 'En retard', grace: 'Lecture seule',
    suspended: 'Suspendu', expired: 'Expiré', canceled: 'Résilié',
  }
  const rows: BillingRow[] = (data?.docs ?? []).map((s) => ({
    id: s.id,
    tenantId: String(typeof s.tenant === 'object' ? s.tenant.id : s.tenant),
    tenantName: (typeof s.tenant === 'object' && (s.tenant.name || s.tenant.domain)) || String(typeof s.tenant === 'object' ? s.tenant.id : s.tenant),
    domain: typeof s.tenant === 'object' ? s.tenant.domain || '' : '',
    plan: s.plan,
    status: s.status,
    statusLabel: STATUS_LABELS[s.status] || s.status,
    currentPeriodEnd: s.currentPeriodEnd || null,
    lastPaymentAt: s.lastPaymentAt || null,
    lastReminderAt: s.lastReminderAt || null,
    seats: s.seats ?? null,
    amount: s.amount ?? null,
    billingEmail: s.billingEmail || null,
    notes: s.notes || null,
  }))

  return (
    <div className="mx-auto max-w-container px-4 py-8 md:px-6 lg:px-8">
      <h1 className="font-heading text-[27px] font-bold tracking-tight text-stone-800">Facturation</h1>
      <p className="mt-1 text-sm text-stone-600">Suivi des abonnements et relances d&apos;impayés.</p>
      <div className="mt-6">
        <BillingAdminTable initialRows={rows} />
      </div>
    </div>
  )
}
