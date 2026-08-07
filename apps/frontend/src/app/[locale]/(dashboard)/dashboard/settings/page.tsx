import { requireAuth } from '@/lib/auth'
import { isSecretaryOnly } from '@/lib/tier-guard'
import { redirect } from 'next/navigation'
import { getTenantId } from '@/lib/tenant'
import { fetchCMS } from '@/lib/cms-fetch'
import { getSubscriptionByTenant } from '@/lib/subscription'
import SettingsTabsContent from './SettingsTabsContent'

export default async function SettingsPage() {
  const user = await requireAuth()
  if (isSecretaryOnly(user)) redirect('/dashboard/rendez-vous')
  const isAdmin = user.roles?.includes('tenant_admin') || user.roles?.includes('superadmin')
  const tenantId = getTenantId(user)

  let practicePhone = ''
  let subscription = null
  if (tenantId) {
    const practiceRes = await fetchCMS<{ phone?: string }>('/api/globals/practice-info?depth=0')
    practicePhone = practiceRes?.phone || ''
    subscription = await getSubscriptionByTenant(tenantId)
  }

  let tenantUsers: { id: string; email: string; name: string; roles: string[] }[] = []
  if (isAdmin && tenantId) {
    const res = await fetchCMS<{ docs: { id: string; email: string; name: string; roles: string[] }[] }>(
      `/api/users?where[tenant][equals]=${tenantId}&depth=0&limit=50`,
    )
    tenantUsers = res?.docs ?? []
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 lg:px-8">
      <h1 className="font-heading text-[27px] font-bold tracking-tight text-stone-800">Paramètres</h1>
      <SettingsTabsContent
        userId={user.id}
        userEmail={user.email}
        userName={user.name || ''}
        practicePhone={practicePhone}
        isAdmin={isAdmin}
        tenantUsers={tenantUsers}
        currentUserId={user.id}
        subscription={subscription}
        hasTenant={!!tenantId}
      />    </div>
  )
}
