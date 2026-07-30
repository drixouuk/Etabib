import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { Link } from '@/i18n/navigation'
import ImportPatientsButton from './ImportPatientsButton'
import PatientTable from './PatientTable'
import { Download } from 'lucide-react'

type Patient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  nationalId?: string | null
  medicalNotes?: string
  updatedAt: string
}

type Consultation = {
  id: string
  patient: string | { id: string }
  date: string
}

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function PatientsListPage({ searchParams }: Props) {
  const { q } = await searchParams
  const user = await requireAuth()
  const tenantId = getTenantId(user)

  let apiPath = `/api/patients?sort=-updatedAt&limit=50`
  if (q?.trim()) {
    const query = encodeURIComponent(q.trim())
    apiPath = `/api/patients?where[and][0][tenant][equals]=${tenantId}&where[and][1][or][0][fullName][contains]=${query}&where[and][1][or][1][nationalId][contains]=${query}&sort=-updatedAt&limit=50`
  } else {
    apiPath = `/api/patients?where[tenant][equals]=${tenantId}&sort=-updatedAt&limit=50`
  }

  const data = await fetchCMS<{ docs: Patient[] }>(apiPath, { revalidate: 0 })
  const patients = data?.docs ?? []

  const patientIds = patients.map(p => p.id)
  const lastConsultations: Record<string, string> = {}

  if (patientIds.length > 0) {
    const inParams = patientIds.map(id => `where[patient][in]=${id}`).join('&')
    const consPath = `/api/consultations?where[tenant][equals]=${tenantId}&${inParams}&sort=-date&depth=0&limit=${patientIds.length}`
    const consData = await fetchCMS<{ docs: Consultation[] }>(consPath, { revalidate: 0 })
    const consultations = consData?.docs ?? []

    for (const c of consultations) {
      const pid = typeof c.patient === 'object' ? c.patient.id : c.patient
      const existing = lastConsultations[pid]
      if (!existing || c.date > existing) {
        lastConsultations[pid] = c.date
      }
    }
  }

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-stone-800">Patients</h1>
          <p className="mt-1 text-[13.5px] text-stone-600">{patients.length} patients suivis</p>
        </div>
        <Link
          href="/dashboard/patients/new"
          className="rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700"
        >
          + Nouveau patient
        </Link>
      </div>

      <form method="GET" className="mt-6">
        <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-white py-2.5 px-[14px] transition-all duration-200 hover:border-primary-500 hover:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-stone-600"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15.5" y2="15.5"/></svg>
          <input
            type="text"
            name="q"
            defaultValue={q || ''}
            placeholder="Rechercher par nom ou CIN…"
            className="flex-1 border-none bg-transparent text-sm text-stone-800 placeholder:text-stone-600 focus:outline-none"
          />
          {q && (
            <Link
              href="/dashboard/patients"
              className="shrink-0 text-sm font-medium text-stone-600 hover:text-stone-800"
            >
              Effacer
            </Link>
          )}
        </div>
      </form>

      <div className="mt-4 mb-4 flex flex-wrap items-center gap-2">
        <a
          href="/api/patients/export"
          download
          className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors duration-200 hover:bg-stone-50"
        >
          <Download className="size-4" />
          Exporter en CSV
        </a>
        <ImportPatientsButton />
      </div>

      <PatientTable patients={patients} lastConsultations={lastConsultations} q={q} />
    </div>
  )
}
