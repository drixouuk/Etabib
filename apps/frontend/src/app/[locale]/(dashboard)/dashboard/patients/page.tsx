import { getTenantId } from '@/lib/tenant'
import { requireTier } from '@/lib/tier-guard'
import { fetchCMS } from '@/lib/cms-fetch'
import { Link } from '@/i18n/navigation'
import PatientTable from './PatientTable'
import PatientSearchAutocomplete from './PatientSearchAutocomplete'

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
  const { user } = await requireTier(['cabinet'])
  const tenantId = getTenantId(user)

  let apiPath = `/api/patients?sort=-updatedAt&limit=50`
  if (q?.trim()) {
    const query = encodeURIComponent(q.trim())
    apiPath = `/api/patients?where[and][0][tenant][equals]=${tenantId}&where[and][1][or][0][fullName][contains]=${query}&where[and][1][or][1][nationalId][contains]=${query}&sort=-updatedAt&limit=50`
  } else {
    apiPath = `/api/patients?where[tenant][equals]=${tenantId}&sort=-updatedAt&limit=50`
  }

  const data = await fetchCMS<{ docs: Patient[] }>(apiPath)
  const patients = data?.docs ?? []

  const patientIds = patients.map(p => p.id)
  const lastConsultations: Record<string, string> = {}

  if (patientIds.length > 0) {
    const inParams = patientIds.map(id => `where[patient][in]=${id}`).join('&')
    const consPath = `/api/consultations?where[tenant][equals]=${tenantId}&${inParams}&sort=-date&depth=0&limit=${patientIds.length}`
    const consData = await fetchCMS<{ docs: Consultation[] }>(consPath)
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
    <div className="mx-auto max-w-container px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[27px] font-bold tracking-tight text-stone-800">Patients</h1>
          <p className="mt-1 text-[13.5px] text-stone-600">{patients.length} patients suivis</p>
        </div>
        <div className="flex w-full items-center gap-3 md:w-auto">
          <PatientSearchAutocomplete initialQ={q || ''} />
          <Link
            href="/dashboard/patients/new"
            className="shrink-0 rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700"
          >
            + Nouveau patient
          </Link>
        </div>
      </div>

      <PatientTable patients={patients} lastConsultations={lastConsultations} q={q} />
    </div>
  )
}
