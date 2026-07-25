import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { getTenantById, getDoctorProfile, getPracticeInfo } from '@/lib/payload'
import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import PatientClinicalFields from './PatientClinicalFields'
import AddToQueueButton from './AddToQueueButton'
import ConsultationForm from './ConsultationForm'
import ConsultationHistory from './ConsultationHistory'
import PrescriptionForm from './PrescriptionForm'
import PrescriptionHistory from './PrescriptionHistory'
import DocumentUpload from './DocumentUpload'
import GrowthChart from './GrowthChart'
import VaccinationRecord from '@/components/dashboard/VaccinationRecord'
import ReferringPractitionersWidget from './ReferringPractitionersWidget'
import SharePatientWidget from './SharePatientWidget'
import PatientAvatar from '@/components/dashboard/PatientAvatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

import { computeAge } from '@/lib/age'
import type { DoctorInfo, PatientInfo } from '@/lib/generate-pdf'

type Patient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  nationalId?: string | null
  antecedents?: string
  allergies?: string
  traitementsEnCours?: string
  medicalNotes?: string
  createdAt: string
  updatedAt: string
}

export type Consultation = {
  id: string
  date: string
  motif?: string | null
  practitioner: { email?: string; name?: string }
  poids?: number | null
  taille?: number | null
  perimetreCranien?: number | null
  diagnostic?: string | null
}

type Medication = {
  nom: string
  dci: string
  posologie: string
  duree: string
}

type Prescription = {
  id: string
  date: string
  medications: Medication[]
  notes?: string | null
  practitioner: { email?: string; name?: string }
}

type Document = {
  id: string
  documentType: string
  filename?: string
  url?: string
  createdAt: string
}

type VaccineScheduleEntry = {
  id: string
  vaccineName: string
  doseLabel: string
  ageMonths: number
  order?: number | null
  notes?: string | null
}

type VaccinationData = {
  id: string
  vaccineName: string
  doseLabel: string
  dateAdministered: string
}

type Props = {
  params: Promise<{ id: string; locale: string }>
}

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params
  const user = await requireAuth()

  const canViewClinical = user.roles?.includes('doctor') || user.roles?.includes('tenant_admin') || user.roles?.includes('superadmin')

  const tenantId = getTenantId(user)
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const isPediatrie = tenant?.settings?.specialty === 'pediatrie'
  const [patient, consultationsData, prescriptionsData, documentsData, scheduleData, vaccinationsData, doctor, practiceInfo] = await Promise.all([
    fetchCMS<Patient>(`/api/patients/${id}`, { revalidate: 0 }),
    canViewClinical
      ? fetchCMS<{ docs: Consultation[] }>(
          `/api/consultations?where[patient][equals]=${id}&sort=-date&depth=1&limit=50`,
          { revalidate: 0 },
        )
      : Promise.resolve(null),
    canViewClinical
      ? fetchCMS<{ docs: Prescription[] }>(
          `/api/prescriptions?where[patient][equals]=${id}&sort=-date&depth=1&limit=50`,
          { revalidate: 0 },
        )
      : Promise.resolve(null),
    canViewClinical
      ? fetchCMS<{ docs: Document[] }>(
          `/api/documents?where[patient][equals]=${id}&sort=-createdAt&depth=0&limit=50`,
          { revalidate: 0 },
        )
      : Promise.resolve(null),
    canViewClinical && isPediatrie
      ? fetchCMS<{ docs: VaccineScheduleEntry[] }>(
          '/api/vaccine-schedule?sort=ageMonths&limit=100&depth=0',
          { revalidate: 60 },
        )
      : Promise.resolve(null),
    canViewClinical && isPediatrie
      ? fetchCMS<{ docs: VaccinationData[] }>(
          `/api/vaccinations?where[patient][equals]=${id}&depth=0&limit=100`,
          { revalidate: 0 },
        )
      : Promise.resolve(null),
    tenantId ? getDoctorProfile(tenantId, 'fr') : Promise.resolve(null),
    tenantId ? getPracticeInfo(tenantId, 'fr') : Promise.resolve(null),
  ])

  if (!patient) notFound()

  const isClinique = tenant?.settings?.activeTier === 'clinique'
  const isDoctor = user.roles?.includes('doctor')

  const sharedWithIds: string[] = (patient as any).sharedWith
    ? Array.isArray((patient as any).sharedWith) ? (patient as any).sharedWith.map((s: any) => typeof s === 'object' ? s.id : s) : []
    : []
  const followedByIds: string[] = (patient as any).followedBy
    ? Array.isArray((patient as any).followedBy) ? (patient as any).followedBy.map((f: any) => typeof f === 'object' ? f.id : f) : []
    : []

  const consultations = consultationsData?.docs ?? []
  const prescriptions = prescriptionsData?.docs ?? []
  const documents = documentsData?.docs ?? []
  const vaccineSchedule = scheduleData?.docs ?? []
  const patientVaccinations = vaccinationsData?.docs ?? []

  const doctorInfo: DoctorInfo | undefined = doctor ? {
    name: doctor.name,
    specialty: doctor.specialty || '',
    rpps: doctor.rpps || '—',
    address: practiceInfo?.address || '',
    phone: practiceInfo?.phone || '',
    city: practiceInfo?.city || '',
  } : undefined

  const patientInfo: PatientInfo | undefined = patient ? {
    name: patient.fullName,
    age: patient.birthDate ? computeAge(patient.birthDate) : '',
    nationalId: patient.nationalId || undefined,
    birthDate: patient.birthDate || undefined,
  } : undefined

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      {/* En-tête compact */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <PatientAvatar fullName={patient.fullName} gender={patient.gender as 'boy' | 'girl' | null} size="lg" />
          <div>
            <h1 className="font-heading text-3xl font-bold text-stone-800">{patient.fullName}</h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-stone-500">
              {patient.nationalId && <span>CIN : {patient.nationalId}</span>}
              {patient.birthDate && (
                <>
                  <span>Né(e) le {new Date(patient.birthDate).toLocaleDateString('fr-FR')}</span>
                  <span className="font-medium text-stone-700">{computeAge(patient.birthDate)}</span>
                </>
              )}
              {patient.phone && <span>{patient.phone}</span>}
            </div>
            <div className="mt-0.5 text-sm text-stone-500">
              {patient.address && <span>{patient.address}</span>}
              {patient.email && <span className="ml-3">{patient.email}</span>}
            </div>
          </div>
        </div>
        <AddToQueueButton patientId={patient.id} />
      </div>

      {/* Bandeau allergie */}
      {patient.allergies?.trim() && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="size-5 shrink-0 text-red-500" />
          Allergie connue : {patient.allergies} — à vérifier avant toute prescription
        </div>
      )}

      {/* Onglets */}
      <Tabs defaultValue="resume" className="mt-2">
        <TabsList className="mb-6">
          <TabsTrigger value="resume">Résumé</TabsTrigger>
          <TabsTrigger value="dossier">Dossier clinique</TabsTrigger>
          <TabsTrigger value="croissance">Croissance</TabsTrigger>
          <TabsTrigger value="consultations">Consultations & ordonnances</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="resume">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-stone-400">Dernière consultation</p>
              {consultations.length > 0 ? (
                <>
                  <p className="mt-1 font-heading text-lg font-bold text-stone-800">
                    {new Date(consultations[0].date).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm text-stone-500">{consultations[0].motif || 'Consultation'}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-stone-400">Aucune consultation</p>
              )}
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-stone-400">Croissance</p>
              {consultations.length > 0 && consultations[0].poids ? (
                <>
                  <p className="mt-1 font-heading text-lg font-bold text-stone-800">
                    {consultations[0].poids} kg
                  </p>
                  {consultations[0].taille && (
                    <p className="text-sm text-stone-500">{consultations[0].taille} cm</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-stone-400">Pas de mesure</p>
              )}
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-stone-400">Traitement en cours</p>
              {patient.traitementsEnCours?.trim() ? (
                <p className="mt-1 text-sm text-stone-700 line-clamp-2">{patient.traitementsEnCours}</p>
              ) : (
                <p className="mt-1 text-sm text-stone-400">Aucun traitement en cours</p>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {tenant && <ReferringPractitionersWidget patientId={patient.id} initialIds={(patient as any).referringPractitioners
              ? Array.isArray((patient as any).referringPractitioners)
                ? (patient as any).referringPractitioners.map((r: any) => typeof r === 'object' ? r.id : r)
                : []
              : []} />}
            {isClinique && isDoctor && (
              <SharePatientWidget
                patientId={patient.id}
                sharedWithIds={sharedWithIds}
                isClinique={isClinique}
                currentUserId={user.id}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="dossier">
          <PatientClinicalFields
            patientId={patient.id}
            initialData={canViewClinical ? {
              medicalNotes: patient.medicalNotes,
              antecedents: patient.antecedents,
              allergies: patient.allergies,
              traitementsEnCours: patient.traitementsEnCours,
            } : null}
          />
        </TabsContent>

        <TabsContent value="croissance">
          {canViewClinical && isPediatrie && <GrowthChart consultations={consultations} patientBirthDate={patient.birthDate} patientGender={patient.gender} />}
          {canViewClinical && isPediatrie && (
            <VaccinationRecord
              patientId={patient.id}
              schedule={vaccineSchedule}
              vaccinations={patientVaccinations}
              patientGender={patient.gender}
              patientBirthDate={patient.birthDate}
            />
          )}
        </TabsContent>

        <TabsContent value="consultations">
          {canViewClinical && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-stone-800">Consultations</h2>
                    {consultations.length > 0 && (
                      <span className="text-xs text-stone-400">({consultations.length})</span>
                    )}
                  </div>
                  <Sheet>
                    <SheetTrigger className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800">
                      + Nouvelle consultation
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-[640px] sm:min-w-[420px] overflow-y-auto">
                      <ConsultationForm patientId={patient.id} consultations={consultations} isPediatrie={isPediatrie} doctorInfo={doctorInfo} patientInfo={patientInfo} />
                    </SheetContent>
                  </Sheet>
                </div>
                <ConsultationHistory consultations={consultations} doctorInfo={doctorInfo} patientInfo={patientInfo} />
              </div>

              <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-stone-800">Ordonnances</h2>
                    {prescriptions.length > 0 && (
                      <span className="text-xs text-stone-400">({prescriptions.length})</span>
                    )}
                  </div>
                  <Sheet>
                    <SheetTrigger className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800">
                      + Nouvelle ordonnance
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-[640px] sm:min-w-[420px] overflow-y-auto">
                      <PrescriptionForm patientId={patient.id} prescriptions={prescriptions} consultations={consultations} tenantId={tenantId} doctorInfo={doctorInfo} patientInfo={patientInfo} />
                    </SheetContent>
                  </Sheet>
                </div>
                <PrescriptionHistory prescriptions={prescriptions} doctorInfo={doctorInfo} patientInfo={patientInfo} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents">
          {canViewClinical && (
            <div className="mb-8">
              <DocumentUpload patientId={patient.id} documents={documents} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
