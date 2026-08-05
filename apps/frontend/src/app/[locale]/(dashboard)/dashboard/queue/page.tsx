import { getTenantId, getDoctorProfileId } from '@/lib/tenant'
import { requireTier } from '@/lib/tier-guard'
import { getTenantById } from '@/lib/payload'
import LiveStatsWidget from '@/components/dashboard/LiveStatsWidget'
import WaitingRoomList from '@/components/dashboard/WaitingRoomList'

export default async function QueuePage() {
  const { user } = await requireTier(['cabinet'])
  const tenantId = getTenantId(user)
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const isClinique = tenant?.settings?.activeTier === 'cabinet'
  const currentDoctorId = getDoctorProfileId(user)

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">File d&apos;attente</h1>
      <div className="mt-6">
        <LiveStatsWidget />
      </div>
      <div className="mt-6">
        <WaitingRoomList
          tenantId={tenantId}
          isClinique={isClinique}
          currentDoctorId={currentDoctorId ? String(currentDoctorId) : undefined}
        />
      </div>
    </div>
  )
}
