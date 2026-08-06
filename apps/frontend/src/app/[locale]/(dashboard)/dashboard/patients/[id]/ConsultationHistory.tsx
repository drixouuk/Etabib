'use client'

import { useState } from 'react'
import { generateConsultationPDF, type DoctorInfo, type PatientInfo } from '@/lib/generate-pdf'

type Consultation = {
  id: string
  date: string
  motif?: string | null
  practitioner: { email?: string; name?: string }
  poids?: number | null
  taille?: number | null
  perimetreCranien?: number | null
  diagnostic?: string | null
  fseStatus?: string | null
  fseSentAt?: string | null
}

type Props = {
  consultations: Consultation[]
  doctorInfo?: DoctorInfo
  patientInfo?: PatientInfo
  onEdit?: (consultation: Consultation) => void
}

export default function ConsultationHistory({ consultations, doctorInfo, patientInfo, onEdit }: Props) {
  const [filterQuery, setFilterQuery] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const filtered = consultations.filter(c => {
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase()
      if (!c.motif?.toLowerCase().includes(q) && !c.diagnostic?.toLowerCase().includes(q)) return false
    }
    if (filterDateFrom && new Date(c.date) < new Date(filterDateFrom)) return false
    if (filterDateTo) {
      const end = new Date(filterDateTo)
      end.setHours(23, 59, 59, 999)
      if (new Date(c.date) > end) return false
    }
    return true
  })

  return (
    <div>
      {consultations.length > 0 && (
        <div className="border-b border-stone-100 px-4 py-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <label className="mb-0.5 block text-xs text-stone-600">Rechercher</label>
              <input type="text" value={filterQuery} onChange={e => setFilterQuery(e.target.value)}
                placeholder="Motif, diagnostic..."
                className="w-full rounded-lg border border-warm bg-white px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-stone-600">Du</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="rounded-lg border border-warm bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-stone-600">Au</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="rounded-lg border border-warm bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            {(filterQuery || filterDateFrom || filterDateTo) && (
              <button onClick={() => { setFilterQuery(''); setFilterDateFrom(''); setFilterDateTo('') }}
                className="rounded-lg border border-warm bg-white px-3 py-1.5 text-sm text-stone-600 hover:text-stone-800 transition-colors duration-200">
                Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-600">
          {consultations.length > 0 ? 'Aucune consultation ne correspond à la recherche.' : 'Aucune consultation.'}
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {filtered.map(c => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
                <span
                  className={`text-sm font-medium ${onEdit ? 'cursor-pointer text-primary-700 hover:text-primary-600' : 'text-stone-800'}`}
                  onClick={() => onEdit?.(c)}
                >
                  {new Date(c.date).toLocaleDateString('fr-FR')}
                </span>
                <span className="flex items-center gap-2">
                  {c.diagnostic && doctorInfo && patientInfo && (
                    <button
                      onClick={() => generateConsultationPDF(doctorInfo, patientInfo, {
                        date: new Date(c.date).toLocaleDateString('fr-FR'),
                        motif: c.motif,
                        diagnostic: c.diagnostic,
                        poids: c.poids,
                        taille: c.taille,
                        perimetreCranien: c.perimetreCranien,
                      })}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      title="Télécharger le certificat PDF"
                    >
                      PDF
                    </button>
                  )}
                  <span className="text-xs text-stone-600">
                    {c.practitioner?.name || c.practitioner?.email || '—'}
                  </span>
                </span>
              </div>
              {c.motif && <p className="mt-1 text-sm text-stone-600">{c.motif}</p>}
              {(c.poids || c.taille || c.perimetreCranien) && (
                <p className="mt-0.5 text-xs text-stone-600">
                  {c.poids && `${c.poids} kg`}{c.poids && c.taille ? ' · ' : ''}{c.taille && `${c.taille} cm`}
                  {((c.poids || c.taille) && c.perimetreCranien) ? ' · ' : ''}{c.perimetreCranien && `PC ${c.perimetreCranien} cm`}
                </p>
              )}
              {c.diagnostic && <p className="mt-0.5 text-xs font-medium text-stone-800">{c.diagnostic}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
