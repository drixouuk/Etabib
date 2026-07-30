import { requireAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { getTenantById } from '@/lib/payload'
import { redirect } from 'next/navigation'

export async function requireTier(allowed: string[]) {
  const user = await requireAuth()
  const tenantId = getTenantId(user)
  if (!tenantId) redirect('/')
  const tenant = await getTenantById(tenantId)
  const tier = tenant?.settings?.activeTier
  if (!tier || !allowed.includes(tier)) redirect('/dashboard/settings')
  return { user, tenant, tenantId, tier }
}
