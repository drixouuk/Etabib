import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { getTenantId } from '@/lib/tenant'
import AuditLogTable from './AuditLogTable'

type AuditLog = {
  id: string
  action: 'read' | 'write' | 'export'
  collectionName: string
  documentId: string
  user: { id: string; name?: string; email?: string }
  timestamp: string
}

export default async function AuditLogsPage() {
  const user = await requireAuth()

  const isAdmin = user.roles?.includes('superadmin') || user.roles?.includes('tenant_admin')
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
        <p className="text-stone-800-soft">Accès réservé aux administrateurs du cabinet.</p>
      </div>
    )
  }

  const data = await fetchCMS<{ docs: AuditLog[] }>(
    `/api/audit-logs?where[tenant][equals]=${getTenantId(user)}&sort=-timestamp&limit=100`,
    { revalidate: 0 },
  )
  const logs = data?.docs ?? []

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-stone-800">Registre d&apos;audit (Loi 09-08)</h1>
        <p className="mt-1 text-sm text-stone-800-soft">Historique immuable des accès et modifications des données de santé.</p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  )
}
