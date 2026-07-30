import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getTenantById } from '@/lib/payload'
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
    return <DashboardShell user={user} tenant={tenant}>{children}</DashboardShell>
  }

  return <DashboardShell user={user} tenant={null}>{children}</DashboardShell>
}
