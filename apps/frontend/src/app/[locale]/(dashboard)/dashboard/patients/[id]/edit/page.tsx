import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { notFound } from 'next/navigation'
import EditPatientForm from './EditPatientForm'

type Patient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  nationalId?: string | null
}

type Props = {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditPatientPage({ params }: Props) {
  const { id } = await params
  await requireAuth()

  const patient = await fetchCMS<Patient>(`/api/patients/${id}`, { revalidate: 0 })
  if (!patient) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-stone-800">
        Modifier {patient.fullName}
      </h1>
      <EditPatientForm patient={patient} />
    </div>
  )
}
