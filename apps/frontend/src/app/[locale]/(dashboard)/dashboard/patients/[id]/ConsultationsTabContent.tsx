'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import ConsultationForm from './ConsultationForm'
import ConsultationHistory from './ConsultationHistory'
import PrescriptionForm from './PrescriptionForm'
import PrescriptionHistory from './PrescriptionHistory'
import type { DoctorInfo, PatientInfo } from '@/lib/generate-pdf'

type Consultation = {
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

type Props = {
  patientId: string
  consultations: Consultation[]
  prescriptions: Prescription[]
  isPediatrie?: boolean
  tenantId?: string
  doctorInfo?: DoctorInfo
  patientInfo?: PatientInfo
}

export default function ConsultationsTabContent({
  patientId,
  consultations,
  prescriptions,
  isPediatrie,
  tenantId,
  doctorInfo,
  patientInfo,
}: Props) {
  const [sheetConsultationOpen, setSheetConsultationOpen] = useState(false)
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null)
  const [sheetPrescriptionOpen, setSheetPrescriptionOpen] = useState(false)
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null)

  const openNewConsultation = () => {
    setEditingConsultation(null)
    setSheetConsultationOpen(true)
  }

  const openEditConsultation = (c: Consultation) => {
    setEditingConsultation(c)
    setSheetConsultationOpen(true)
  }

  const closeConsultation = () => {
    setSheetConsultationOpen(false)
    setEditingConsultation(null)
  }

  const openNewPrescription = () => {
    setEditingPrescription(null)
    setSheetPrescriptionOpen(true)
  }

  const openEditPrescription = (p: Prescription) => {
    setEditingPrescription(p)
    setSheetPrescriptionOpen(true)
  }

  const closePrescription = () => {
    setSheetPrescriptionOpen(false)
    setEditingPrescription(null)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">Consultations</h2>
            {consultations.length > 0 && (
              <span className="text-xs text-muted-foreground">({consultations.length})</span>
            )}
          </div>
          <Sheet open={sheetConsultationOpen} onOpenChange={setSheetConsultationOpen}>
            <SheetTrigger onClick={openNewConsultation} className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700">
              + Nouvelle consultation
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
              <ConsultationForm
                patientId={patientId}
                consultations={consultations}
                isPediatrie={isPediatrie}
                doctorInfo={doctorInfo}
                patientInfo={patientInfo}
                editingConsultation={editingConsultation}
                onClose={closeConsultation}
              />
            </SheetContent>
          </Sheet>
        </div>
        <ConsultationHistory
          consultations={consultations}
          doctorInfo={doctorInfo}
          patientInfo={patientInfo}
          onEdit={openEditConsultation}
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">Ordonnances</h2>
            {prescriptions.length > 0 && (
              <span className="text-xs text-muted-foreground">({prescriptions.length})</span>
            )}
          </div>
          <Sheet open={sheetPrescriptionOpen} onOpenChange={setSheetPrescriptionOpen}>
            <SheetTrigger onClick={openNewPrescription} className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700">
              + Nouvelle ordonnance
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
              <PrescriptionForm
                patientId={patientId}
                prescriptions={prescriptions}
                consultations={consultations}
                tenantId={tenantId}
                doctorInfo={doctorInfo}
                patientInfo={patientInfo}
                editingPrescription={editingPrescription}
                onClose={closePrescription}
              />
            </SheetContent>
          </Sheet>
        </div>
        <PrescriptionHistory
          prescriptions={prescriptions}
          doctorInfo={doctorInfo}
          patientInfo={patientInfo}
          onEdit={openEditPrescription}
        />
      </div>
    </div>
  )
}
