'use client'

// Onglet CNSS de la fiche patient : couverture AMO + suivi FSE des
// consultations (mise à jour manuelle du statut) + génération de la feuille
// de soins (trame CNSS) + accès au portail. Déclaratif — aucune API CNSS.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ExternalLink, Pencil } from 'lucide-react'
import FseStatusBadge, { FSE_STATUS_OPTIONS } from '@/components/dashboard/FseStatusBadge'
import CnssPortalEmbed from '@/components/dashboard/CnssPortalEmbed'
import { generateFsePDF, type DoctorInfo } from '@/lib/generate-pdf'

type CnssPatient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  nationalId?: string | null
  cnssRegistrationNumber?: string | null
  cnssRegime?: string | null
  cnssCardUploadedAt?: string | null
}

type CnssConsultation = {
  id: string
  date: string
  motif?: string | null
  codeActe?: string | null
  fseStatus?: string | null
  fseSentAt?: string | null
  practitioner?: { email?: string; name?: string }
}

const REGIME_LABELS: Record<string, string> = {
  ayant_droit: 'Ayant droit',
  salarie: 'Salarié',
  independant: 'Indépendant',
  etudiant: 'Étudiant',
}

type Props = {
  patient: CnssPatient
  consultations: CnssConsultation[]
  doctorInfo?: DoctorInfo
}

export default function CnssTab({ patient, consultations, doctorInfo }: Props) {
  const router = useRouter()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editNumber, setEditNumber] = useState(patient.cnssRegistrationNumber || '')
  const [editRegime, setEditRegime] = useState(patient.cnssRegime || '')
  const [editCardDate, setEditCardDate] = useState(patient.cnssCardUploadedAt ? patient.cnssCardUploadedAt.slice(0, 10) : '')
  const [savingCnss, setSavingCnss] = useState(false)
  const [cnssError, setCnssError] = useState('')

  const saveCnss = async () => {
    setSavingCnss(true)
    setCnssError('')
    const res = await fetch(`/api/cms-proxy/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cnssRegistrationNumber: editNumber.trim() || undefined,
        cnssRegime: editRegime || undefined,
        cnssCardUploadedAt: editCardDate || undefined,
      }),
    }).catch(() => null)
    setSavingCnss(false)
    if (res && res.ok) {
      setEditing(false)
      router.refresh()
    } else {
      setCnssError('Erreur lors de l’enregistrement des informations CNSS.')
    }
  }

  const updateFseStatus = async (c: CnssConsultation, value: string) => {
    setSavingId(c.id)
    const body: Record<string, unknown> = { fseStatus: value }
    if (value === 'envoyee' && !c.fseSentAt) {
      body.fseSentAt = new Date().toISOString()
    }
    const res = await fetch(`/api/cms-proxy/consultations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    setSavingId(null)
    if (res && res.ok) router.refresh()
  }

  const generateSheet = (c: CnssConsultation) => {
    if (!doctorInfo) return
    generateFsePDF(
      doctorInfo,
      {
        name: patient.fullName,
        age: patient.birthDate
          ? `${Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))} ans`
          : '—',
        nationalId: patient.nationalId || undefined,
        birthDate: patient.birthDate || undefined,
        cnssRegistrationNumber: patient.cnssRegistrationNumber,
        cnssRegime: patient.cnssRegime,
      },
      [
        {
          date: c.date,
          codeActe: c.codeActe || null,
          designation: c.motif || 'Consultation',
          montant: 300, // Tarif de la consultation — à paramétrer par acte (NGAP)
        },
      ],
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Couverture CNSS / AMO */}
      <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-[14.5px] font-semibold text-stone-800">Couverture CNSS / AMO</h3>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700 hover:text-primary-800"
            >
              <Pencil className="size-3.5" /> Modifier
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="cnssEditNumber" className="mb-1 block text-[12.5px] font-medium text-stone-700">N° immatriculation</label>
                <input
                  id="cnssEditNumber"
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  type="text"
                  placeholder="Ex : 100482193"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label htmlFor="cnssEditRegime" className="mb-1 block text-[12.5px] font-medium text-stone-700">Régime</label>
                <select
                  id="cnssEditRegime"
                  value={editRegime}
                  onChange={(e) => setEditRegime(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">Non renseigné</option>
                  <option value="ayant_droit">Ayant droit</option>
                  <option value="salarie">Salarié</option>
                  <option value="independant">Indépendant</option>
                  <option value="etudiant">Étudiant</option>
                </select>
              </div>
              <div>
                <label htmlFor="cnssEditCard" className="mb-1 block text-[12.5px] font-medium text-stone-700">Carte CNSS uploadée le</label>
                <input
                  id="cnssEditCard"
                  value={editCardDate}
                  onChange={(e) => setEditCardDate(e.target.value)}
                  type="date"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            {cnssError && <p className="text-[12.5px] font-medium text-error-600">{cnssError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveCnss}
                disabled={savingCnss}
                className="rounded-lg bg-cta-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-cta-700 disabled:opacity-50"
              >
                {savingCnss ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setCnssError('') }}
                className="text-[12.5px] font-medium text-stone-600 hover:text-stone-800"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
        <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-3">
          <div className="rounded-lg bg-primary-50/50 px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">N° immatriculation</p>
            <p className="mt-0.5 font-semibold text-stone-800">{patient.cnssRegistrationNumber || 'Non renseigné'}</p>
          </div>
          <div className="rounded-lg bg-primary-50/50 px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Régime</p>
            <p className="mt-0.5 font-semibold text-stone-800">
              {patient.cnssRegime ? (REGIME_LABELS[patient.cnssRegime] || patient.cnssRegime) : 'Non renseigné'}
            </p>
          </div>
          <div className="rounded-lg bg-primary-50/50 px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Carte CNSS</p>
            <p className="mt-0.5 font-semibold text-stone-800">
              {patient.cnssCardUploadedAt
                ? `Uploadée le ${new Date(patient.cnssCardUploadedAt).toLocaleDateString('fr-FR')}`
                : 'Non uploadée'}
            </p>
          </div>
        </div>
        )}
      </div>

      {/* Suivi FSE */}
      <div className="rounded-xl border border-warm bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-[14.5px] font-semibold text-stone-800">Suivi FSE</h3>
          <CnssPortalEmbed />
        </div>
        <p className="mt-1 text-[12.5px] text-stone-500">
          Statut mis à jour manuellement après retour CNSS. « Envoyée » depuis plus de 30 jours = délai anormal.
        </p>

        {consultations.length === 0 ? (
          <p className="mt-3 text-[13px] text-stone-500">Aucune consultation pour ce patient.</p>
        ) : (
          <div className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-100">
            {consultations.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                <span className="w-[86px] shrink-0 text-[12.5px] font-medium text-stone-800">
                  {new Date(c.date).toLocaleDateString('fr-FR')}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-stone-600">{c.motif || 'Consultation'}</span>
                <select
                  value={c.fseStatus || 'non_envoyee'}
                  onChange={(e) => updateFseStatus(c, e.target.value)}
                  disabled={savingId === c.id}
                  title="Mettre à jour le statut FSE (après retour CNSS)"
                  aria-label={`Statut FSE du ${new Date(c.date).toLocaleDateString('fr-FR')}`}
                  className="rounded-md border border-warm bg-white px-1.5 py-1 text-[11px] font-semibold text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  {FSE_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <FseStatusBadge status={c.fseStatus} sentAt={c.fseSentAt} />
                <button
                  type="button"
                  onClick={() => generateSheet(c)}
                  disabled={!doctorInfo || !patient.cnssRegistrationNumber}
                  title={
                    !patient.cnssRegistrationNumber
                      ? 'Immatriculation CNSS requise pour la feuille de soins'
                      : 'Générer la feuille de soins CNSS'
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-warm bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileText className="size-3.5" /> Feuille de soins
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!patient.cnssRegistrationNumber && (
        <p className="flex items-center gap-2 text-[12.5px] text-amber-700">
          <ExternalLink className="size-3.5" />
          Patient sans immatriculation CNSS : la génération de feuille de soins est désactivée (hors AMO ou non communiqué).
        </p>
      )}
    </div>
  )
}
