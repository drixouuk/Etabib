'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  patientId: string
  initialData: {
    medicalNotes?: string
    antecedents?: string
    allergies?: string
    traitementsEnCours?: string
  } | null
}

const fields = [
  { key: 'medicalNotes', label: 'Notes médicales' },
  { key: 'antecedents', label: 'Antécédents médicaux' },
  { key: 'allergies', label: 'Allergies connues' },
  { key: 'traitementsEnCours', label: 'Traitements en cours' },
]

export default function PatientClinicalFields({ patientId, initialData }: Props) {
  const router = useRouter()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({
    medicalNotes: initialData?.medicalNotes ?? '',
    antecedents: initialData?.antecedents ?? '',
    allergies: initialData?.allergies ?? '',
    traitementsEnCours: initialData?.traitementsEnCours ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (!initialData) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
        Dossier clinique — accès restreint aux médecins.
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    const res = await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      setError("Erreur lors de l'enregistrement. Veuillez réessayer.")
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Dossier clinique</h2>
      </div>
      {fields.map((f) => {
        const val = values[f.key]
        const isOpen = expandedSection === f.key
        return (
          <div key={f.key} className={`border-b border-stone-100 last:border-0 ${f.key === 'allergies' && val ? 'border-red-200 bg-red-50/30' : ''}`}>
            <button
              type="button"
              onClick={() => setExpandedSection(isOpen ? null : f.key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-200 hover:bg-stone-50"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-stone-700">{f.label}</span>
                {!isOpen && val && (
                  <p className="mt-0.5 truncate text-xs text-stone-500">{val.slice(0, 80)}{val.length > 80 ? '...' : ''}</p>
                )}
                {!isOpen && !val && (
                  <p className="mt-0.5 text-xs italic text-stone-300">Aucune information</p>
                )}
              </div>
              <span className="ml-2 shrink-0 text-xs text-stone-400">
                {isOpen ? 'Fermer ▲' : 'Modifier ▼'}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4">
                <textarea
                  rows={4}
                  value={val}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  placeholder={`Saisir ${f.label.toLowerCase()}...`}
                />
              </div>
            )}
          </div>
        )
      })}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={handleSave} disabled={saving}
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        {saved && <span className="text-sm text-green-600">Enregistré ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
