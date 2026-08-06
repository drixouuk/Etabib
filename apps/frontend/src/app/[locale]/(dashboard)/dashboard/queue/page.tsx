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
    <div className="mx-auto flex min-h-0 max-w-container flex-col px-4 py-8 md:px-6 lg:px-8 lg:h-[calc(100vh-110px)]">
      <h1 className="shrink-0 font-heading text-[27px] font-bold tracking-tight text-stone-800">File d&apos;attente</h1>
      <div className="mt-6 shrink-0">
        <LiveStatsWidget />
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <WaitingRoomList
          tenantId={tenantId}
          isClinique={isClinique}
          currentDoctorId={currentDoctorId ? String(currentDoctorId) : undefined}
        />
      </div>
    </div>
  )
}
