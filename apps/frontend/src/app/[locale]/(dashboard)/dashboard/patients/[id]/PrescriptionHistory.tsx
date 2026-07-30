'use client'

import { useState } from 'react'
import { generatePrescriptionPDF, type DoctorInfo, type PatientInfo } from '@/lib/generate-pdf'

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
  prescriptions: Prescription[]
  doctorInfo?: DoctorInfo
  patientInfo?: PatientInfo
  onEdit?: (prescription: Prescription) => void
}

export default function PrescriptionHistory({ prescriptions, doctorInfo, patientInfo, onEdit }: Props) {
  const [filterQuery, setFilterQuery] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const filtered = prescriptions.filter(p => {
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase()
      const inMeds = p.medications?.some(m => m.nom?.toLowerCase().includes(q))
      const inNotes = p.notes?.toLowerCase().includes(q)
      if (!inMeds && !inNotes) return false
    }
    if (filterDateFrom && new Date(p.date) < new Date(filterDateFrom)) return false
    if (filterDateTo) {
      const end = new Date(filterDateTo)
      end.setHours(23, 59, 59, 999)
      if (new Date(p.date) > end) return false
    }
    return true
  })

  return (
    <div>
      {prescriptions.length > 0 && (
        <div className="border-b border-stone-100 px-4 py-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <label className="mb-0.5 block text-xs text-stone-600">Rechercher</label>
              <input type="text" value={filterQuery} onChange={e => setFilterQuery(e.target.value)}
                placeholder="Médicament, notes..."
                className="w-full rounded-lg border border-warm bg-white px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-stone-600">Du</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="rounded-lg border border-warm bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-stone-600">Au</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="rounded-lg border border-warm bg-white px-2 py-1.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
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
          {prescriptions.length > 0 ? 'Aucune ordonnance ne correspond à la recherche.' : 'Aucune ordonnance.'}
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {filtered.map(p => (
            <div key={p.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-sm font-medium ${onEdit ? 'cursor-pointer text-primary-700 hover:text-primary-600' : 'text-stone-800'}`}
                  onClick={() => onEdit?.(p)}
                >
                  {new Date(p.date).toLocaleDateString('fr-FR')}
                </span>
                <span className="flex items-center gap-2">
                  {p.medications?.length > 0 && doctorInfo && patientInfo && (
                    <button
                      onClick={() => generatePrescriptionPDF(doctorInfo, patientInfo, {
                        date: new Date(p.date).toLocaleDateString('fr-FR'),
                        medications: p.medications,
                        notes: p.notes,
                      })}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      title="Télécharger l'ordonnance PDF"
                    >
                      PDF
                    </button>
                  )}
                  <span className="text-xs text-stone-600">
                    {p.practitioner?.name || p.practitioner?.email || '—'}
                  </span>
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {p.medications?.map((m, i) => (
                  <li key={i} className="text-sm text-stone-600">
                    {m.nom}{m.dci ? ` (${m.dci})` : ''} — {m.posologie} — {m.duree}
                  </li>
                ))}
              </ul>
              {p.notes && <p className="mt-1 text-xs text-stone-600">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
