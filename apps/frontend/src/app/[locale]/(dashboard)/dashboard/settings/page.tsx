import { requireAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { fetchCMS } from '@/lib/cms-fetch'
import SettingsTabsContent from './SettingsTabsContent'

export default async function SettingsPage() {
  const user = await requireAuth()
  const isAdmin = user.roles?.includes('tenant_admin') || user.roles?.includes('superadmin')
  const tenantId = getTenantId(user)

  let practicePhone = ''
  if (tenantId) {
    const practiceRes = await fetchCMS<{ phone?: string }>('/api/globals/practice-info?depth=0', { revalidate: 0 })
    practicePhone = practiceRes?.phone || ''
  }

  let tenantUsers: { id: string; email: string; name: string; roles: string[] }[] = []
  if (isAdmin && tenantId) {
    const res = await fetchCMS<{ docs: { id: string; email: string; name: string; roles: string[] }[] }>(
      `/api/users?where[tenant][equals]=${tenantId}&depth=0&limit=50`,
      { revalidate: 0 },
    )
    tenantUsers = res?.docs ?? []
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-stone-800">Paramètres</h1>
      <SettingsTabsContent
        userId={user.id}
        userEmail={user.email}
        userName={user.name || ''}
        practicePhone={practicePhone}
        isAdmin={isAdmin}
        tenantUsers={tenantUsers}
        currentUserId={user.id}
      />
    </div>
  )
}
