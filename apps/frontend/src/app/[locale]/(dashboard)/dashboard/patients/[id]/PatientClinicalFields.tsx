'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'

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
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({
    medicalNotes: initialData?.medicalNotes ?? '',
    antecedents: initialData?.antecedents ?? '',
    allergies: initialData?.allergies ?? '',
    traitementsEnCours: initialData?.traitementsEnCours ?? '',
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (!initialData) {
    return (
      <div className="rounded-lg border border-warm bg-stone-50 px-4 py-6 text-center text-sm text-ink-soft">
        Dossier clinique — accès restreint aux médecins.
      </div>
    )
  }

  const handleSave = async (key: string) => {
    setSaving(key)
    setSaved(null)
    setError('')
    const payload = { [key]: values[key] }
    const res = await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setSaved(key)
      setEditing(null)
      router.refresh()
    } else {
      setError("Erreur lors de l'enregistrement. Veuillez réessayer.")
    }
    setSaving(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {fields.map((f) => {
        const val = values[f.key]
        const isEditing = editing === f.key
        const isAllergies = f.key === 'allergies'
        const hasContent = isAllergies && val?.trim()

        return (
          <div
            key={f.key}
            className={`rounded-[14px] border p-4 shadow-warm-sm ${
              hasContent ? 'border-red-200 bg-red-50/30' : 'border-warm bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13.5px] font-semibold text-ink">{f.label}</h4>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setEditing(f.key)}
                  className="rounded-lg p-1 text-ink-softer transition-colors duration-200 hover:bg-stone-100 hover:text-stone-600"
                  aria-label={`Modifier ${f.label}`}
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={val}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-softer focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  placeholder={`Saisir ${f.label.toLowerCase()}...`}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(f.key)}
                    disabled={saving === f.key}
                    className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50"
                  >
                    {saving === f.key ? '…' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(null); setValues((prev) => ({ ...prev, [f.key]: initialData?.[f.key as keyof typeof initialData] ?? '' })) }}
                    className="text-xs text-ink-soft hover:text-ink"
                  >
                    Annuler
                  </button>
                  {saved === f.key && <span className="text-xs text-green-600">✓</span>}
                </div>
              </div>
            ) : (
              <>
                {val?.trim() ? (
                  <p className="text-sm text-ink whitespace-pre-wrap">{val}</p>
                ) : (
                  <p className="text-xs italic text-stone-300">Aucune information</p>
                )}
              </>
            )}
          </div>
        )
      })}
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
    </div>
  )
}
