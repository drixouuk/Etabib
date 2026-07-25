import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getTenantById } from '@/lib/payload'
import { Link } from '@/i18n/navigation'
import LiveStatsWidget from '@/components/dashboard/LiveStatsWidget'
import PatientSearchBar from '@/components/dashboard/PatientSearchBar'
import QueuePreview from '@/components/dashboard/QueuePreview'
import VaccinationAlerts from '@/components/dashboard/VaccinationAlerts'

function greeterName(name?: string): string {
  if (!name) return ''
  const short = name.replace(/^(Dr\.?\s*|Pr\.?\s*|M\.?\s*|Mme\.?\s*)/i, '').trim()
  return short.split(' ')[0] || name
}

export default async function DashboardPage() {
  const user = await requireAuth()
  const isSuperadmin = user.roles?.includes('superadmin')

  const tenantId = getTenantId(user)
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const isPediatrie = tenant?.settings?.specialty === 'pediatrie'

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[27px] font-bold tracking-tight text-stone-800">
            Bonjour{user.name ? `, Dr. ${greeterName(user.name)}` : ''} 👋
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-400 first-letter:capitalize">{today}</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link href="/dashboard/patients" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-primary-700 transition-colors duration-200">
            Patients
          </Link>
          {(user.roles?.includes('tenant_admin') || isSuperadmin) && (
            <Link href="/dashboard/audit-logs" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-primary-700 transition-colors duration-200">
              Registre d&apos;audit
            </Link>
          )}
          {isSuperadmin && (
            <Link href="/dashboard/system-alerts" className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-primary-700 transition-colors duration-200">
              Alertes système
            </Link>
          )}
        </nav>
      </div>

      <div className="mt-6">
        <PatientSearchBar />
      </div>

      <div className="mt-6">
        <LiveStatsWidget clickable />
      </div>

      <div className={`mt-6 grid grid-cols-1 gap-6 ${isPediatrie ? 'lg:grid-cols-2' : ''}`}>
        <QueuePreview />
        {isPediatrie && <VaccinationAlerts />}
      </div>
    </div>
  )
}
