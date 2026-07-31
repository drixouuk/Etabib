import { getTenantId } from '@/lib/tenant'
import { requireTier, isSecretaryOnly } from '@/lib/tier-guard'
import { redirect } from 'next/navigation'
import { getTenantById } from '@/lib/payload'
import LiveStatsWidget from '@/components/dashboard/LiveStatsWidget'
import PatientSearchBar from '@/components/dashboard/PatientSearchBar'
import QueuePreview from '@/components/dashboard/QueuePreview'
import VaccinationAlerts from '@/components/dashboard/VaccinationAlerts'

export default async function DashboardPage() {
  const { user } = await requireTier(['cabinet'])
  if (isSecretaryOnly(user)) redirect('/dashboard/rendez-vous')
  const isSuperadmin = user.roles?.includes('superadmin')

  const tenantId = getTenantId(user)
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const isPediatrie = tenant?.settings?.specialty === 'pediatrie'

  return (
    <div className="p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-[27px] font-bold tracking-tight text-[#2A241C]">
            Bonjour{user.name ? `, Dr. ${user.name.replace(/^Dr\.?\s*/i, '')}` : ''} 👋
          </h1>
          <p className="mt-1 text-[13.5px] text-[#2A241C]-soft">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <PatientSearchBar />
      </div>

      <div className="mb-5">
        <LiveStatsWidget clickable />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
        <div className="rounded-2xl border border-warm bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">File d&apos;attente</h3>
          <QueuePreview />
        </div>
        <div className="rounded-2xl border border-warm bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">Rappels vaccinaux</h3>
          {isPediatrie ? <VaccinationAlerts /> : (
            <div className="flex items-center gap-2.5 rounded-[10px] bg-primary-50 px-3.5 py-3 text-[13px] text-primary-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg>
              Tous les patients sont à jour
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
