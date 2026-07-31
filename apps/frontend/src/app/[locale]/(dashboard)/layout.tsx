import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getTenantById } from '@/lib/payload'
import { getSubscriptionByTenant } from '@/lib/subscription'
import DashboardShell from '@/components/dashboard/DashboardShell'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayout({ children }: Props) {
  const user = await requireAuth()

  const tenantId = getTenantId(user)
  if (tenantId) {
    const tenant = await getTenantById(tenantId)
    const subscription = await getSubscriptionByTenant(tenantId)
    const billingStatus =
      subscription && (subscription.status === 'past_due' || subscription.status === 'grace')
        ? subscription.status
        : null
    return <DashboardShell user={user} tenant={tenant} billingStatus={billingStatus}>{children}</DashboardShell>
  }

  return <DashboardShell user={user} tenant={null}>{children}</DashboardShell>
}
