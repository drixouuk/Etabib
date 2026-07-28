import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { Link } from '@/i18n/navigation'
import { AlertTriangle, CalendarCheck } from 'lucide-react'
import { computePatientAlerts, computeAgeMonths } from '@/lib/vaccination-utils'
import type { ScheduleEntry, VaccinationData } from '@/lib/vaccination-utils'

type Patient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
}

export default async function VaccinationAlerts() {
  const user = await requireAuth()
  const tenantId = getTenantId(user)

  const [patientsData, scheduleData, vaccinsData] = await Promise.all([
    fetchCMS<{ docs: Patient[] }>(`/api/patients?where[tenant][equals]=${tenantId}&limit=500&depth=0`, { revalidate: 60 }),
    fetchCMS<{ docs: ScheduleEntry[] }>('/api/vaccine-schedule?sort=ageMonths&limit=100&depth=0', { revalidate: 60 }),
    fetchCMS<{ docs: VaccinationData[] }>(`/api/vaccinations?where[tenant][equals]=${tenantId}&limit=1000&depth=0`, { revalidate: 0 }),
  ])

  const patients = patientsData?.docs ?? []
  const schedule = scheduleData?.docs ?? []
  const vaccinations = vaccinsData?.docs ?? []

  if (patients.length === 0) {
    return (
      <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
        <h3 className="font-heading text-base font-semibold text-stone-800">Rappels vaccinaux</h3>
        <p className="mt-2 text-sm text-stone-800-softer">Aucun patient enregistré</p>
      </div>
    )
  }

  const alerts = patients
    .map((p) => computePatientAlerts(p.id, p.fullName, p.gender, p.birthDate, schedule, vaccinations))
    .filter(Boolean)
    .slice(0, 10)

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-primary/15 bg-primary-50 p-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="size-5 text-primary-600" />
          <h3 className="font-heading text-base font-semibold text-primary-700">Rappels vaccinaux</h3>
        </div>
        <p className="mt-2 text-sm text-primary-600">Tous les patients sont à jour</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
        <AlertTriangle className="size-5 text-warning" />
        <h3 className="font-heading text-base font-semibold text-stone-800">Rappels vaccinaux</h3>
      </div>
      <div className="divide-y divide-stone-100">
        {alerts.map((a) => (
          <div key={a!.patientId} className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <Link
                href={`/dashboard/patients/${a!.patientId}`}
                className="text-sm font-medium text-stone-800 hover:text-primary-600 transition-colors duration-200"
              >
                {a!.patientName}
              </Link>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {a!.vaccines.slice(0, 3).map((v, i) => (
                  <span key={i} className="inline-block rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                    {v.vaccineName}
                  </span>
                ))}
                {a!.vaccines.length > 3 && (
                  <span className="text-xs text-stone-800-soft">+{a!.vaccines.length - 3}</span>
                )}
              </div>
            </div>
            <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              a!.status === 'overdue' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
            }`}>
              {a!.status === 'overdue' ? 'En retard' : 'À venir'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
