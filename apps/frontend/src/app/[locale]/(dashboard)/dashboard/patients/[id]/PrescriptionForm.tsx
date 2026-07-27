'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { DoctorInfo, PatientInfo } from '@/lib/generate-pdf'

type MedicationSuggestion = {
  nom: string
  dci: string
  count: number
}

type Medication = {
  nom: string
  dci: string
  posologie: string
  duree: string
}

type TemplateDoc = {
  id: string
  name: string
  medications?: { nom: string; dci: string; posologie: string; duree: string }[]
  notes?: string | null
}

type Prescription = {
  id: string
  date: string
  medications: Medication[]
  notes?: string | null
  practitioner: { email?: string; name?: string }
}

type ConsultationOption = {
  id: string
  date: string
  motif?: string | null
}

type Props = {
  patientId: string
  prescriptions: Prescription[]
  consultations: ConsultationOption[]
  tenantId?: string
  doctorInfo?: DoctorInfo
  patientInfo?: PatientInfo
}

export default function PrescriptionForm({ patientId, prescriptions, consultations, tenantId, doctorInfo, patientInfo }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [medications, setMedications] = useState<Medication[]>([
    { nom: '', dci: '', posologie: '', duree: '' },
  ])
  const [notes, setNotes] = useState('')
  const [consultationId, setConsultationId] = useState(
    consultations.length > 0 ? consultations[0].id : '',
  )
  const [error, setError] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showTemplateSave, setShowTemplateSave] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<TemplateDoc[]>([])
  const [suggestions, setSuggestions] = useState<Record<number, MedicationSuggestion[]>>({})
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const debounceRef = useRef<Record<number, NodeJS.Timeout>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const searchMedications = async (i: number, query: string) => {
    if (query.trim().length < 2) {
      setSuggestions(prev => ({ ...prev, [i]: [] }))
      setOpenDropdown(null)
      return
    }
    setLoadingSuggestions(true)
    const res = await fetch(`/api/medications/autocomplete?q=${encodeURIComponent(query.trim())}`)
    if (res.ok) {
      const data = await res.json()
      setSuggestions(prev => ({ ...prev, [i]: data.suggestions ?? [] }))
      if (data.suggestions?.length > 0) setOpenDropdown(i)
    }
    setLoadingSuggestions(false)
  }

  useEffect(() => {
    fetch('/api/cms-proxy/templates?where[type][equals]=prescription&depth=0&limit=50')
      .then(r => r.json())
      .then(j => setTemplates(j.docs ?? []))
      .catch(() => {})
  }, [])

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    const res = await fetch('/api/cms-proxy/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName.trim(),
        type: 'prescription',
        medications: medications.filter(m => m.nom.trim()),
        notes: notes || undefined,
      }),
    })
    if (res.ok) {
      const t = await fetch('/api/cms-proxy/templates?where[type][equals]=prescription&depth=0&limit=50')
      const j = await t.json()
      setTemplates(j.docs ?? [])
    }
    setShowTemplateSave(false)
    setTemplateName('')
    setSavingTemplate(false)
  }

  const updateMed = (i: number, field: keyof Medication, value: string) => {
    setMedications(prev => prev.map((m, j) => (j === i ? { ...m, [field]: value } : m)))
  }

  const addMedication = () => {
    setMedications(prev => [...prev, { nom: '', dci: '', posologie: '', duree: '' }])
  }

  const removeMedication = (i: number) => {
    setMedications(prev => prev.filter((_, j) => j !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const body: Record<string, unknown> = {
      patient: patientId,
      medications: medications.filter(m => m.nom.trim()),
      notes: notes || undefined,
    }
    if (consultationId) {
      body.consultation = consultationId
    }

    const res = await fetch('/api/cms-proxy/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setShowForm(false)
      setMedications([{ nom: '', dci: '', posologie: '', duree: '' }])
      setNotes('')
      router.refresh()
    } else {
      setError("Erreur lors de l'enregistrement. Veuillez réessayer.")
    }
    setSaving(false)
  }

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

  return (
    <div className="rounded-xl border border-warm bg-white shadow-warm-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold text-ink">Ordonnances</h2>
          {prescriptions.length > 0 && (
            <span className="text-xs text-ink-soft">({prescriptions.length})</span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700"
          >
            Nouvelle ordonnance
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find(tmpl => tmpl.id === e.target.value)
                  if (t) {
                    if (t.medications?.length) setMedications(t.medications)
                    if (t.notes) setNotes(t.notes)
                  }
                }}
                className="rounded-lg border border-warm bg-white px-3 py-2 text-sm text-ink focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              >
                <option value="">Charger un modèle...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          {medications.map((med, i) => (
            <div key={i} className="rounded-lg border border-warm bg-stone-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">Médicament {i + 1}</span>
                {medications.length > 1 && (
                  <button type="button" onClick={() => removeMedication(i)} className="text-xs text-red-500 hover:text-red-700">Retirer</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="mb-0.5 block text-xs text-stone-600">Nom *</label>
                  <input
                    ref={(el) => { inputRefs.current[i] = el }}
                    value={med.nom}
                    onChange={e => {
                      const val = e.target.value
                      updateMed(i, 'nom', val)
                      if (debounceRef.current[i]) clearTimeout(debounceRef.current[i])
                      debounceRef.current[i] = setTimeout(() => searchMedications(i, val), 300)
                    }}
                    onFocus={() => { if (med.nom.trim().length >= 2) searchMedications(i, med.nom) }}
                    onBlur={() => setTimeout(() => setOpenDropdown(curr => curr === i ? null : curr), 200)}
                    required
                    className={inputClass}
                    autoComplete="off"
                  />
                  {openDropdown === i && suggestions[i]?.length > 0 && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-warm bg-white py-1 shadow-lg">
                      {suggestions[i].map((s, si) => (
                        <button
                          key={si}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); updateMed(i, 'nom', s.nom); updateMed(i, 'dci', s.dci); setOpenDropdown(null) }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink transition-colors duration-200 hover:bg-primary-50"
                        >
                          <span className="font-medium">{s.nom}</span>
                          <span className="text-xs text-ink-soft">{s.count !== undefined && `×${s.count}`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-stone-600">DCI</label>
                  <input value={med.dci} onChange={e => updateMed(i, 'dci', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-stone-600">Posologie *</label>
                  <input value={med.posologie} onChange={e => updateMed(i, 'posologie', e.target.value)} required className={inputClass} />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-stone-600">Durée *</label>
                  <input value={med.duree} onChange={e => updateMed(i, 'duree', e.target.value)} required className={inputClass} />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addMedication} className="self-start text-sm font-medium text-primary-600 hover:text-primary-700">
            + Ajouter un médicament
          </button>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Notes</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} />
          </div>

          {consultations.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Rattacher à une consultation <span className="text-ink-soft">(optionnel)</span>
              </label>
              <select
                value={consultationId}
                onChange={e => setConsultationId(e.target.value)}
                className={inputClass}
              >
                <option value="">Aucune</option>
                {consultations.map(c => (
                  <option key={c.id} value={c.id}>
                    {new Date(c.date).toLocaleDateString('fr-FR')}{c.motif ? ` — ${c.motif}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer l\'ordonnance'}
            </button>
            {!showTemplateSave ? (
              <button type="button" onClick={() => setShowTemplateSave(true)}
                className="rounded-lg border border-warm bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
                Sauvegarder comme modèle
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                  placeholder="Nom du modèle" autoFocus
                  className="rounded-lg border border-warm bg-white px-3 py-2 text-sm text-ink focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
                <button type="button" onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}
                  className="rounded-lg bg-cta-600 px-3 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
                  Enregistrer
                </button>
                <button type="button" onClick={() => { setShowTemplateSave(false); setTemplateName('') }}
                  className="text-sm text-ink-soft hover:text-ink">
                  Annuler
                </button>
              </div>
            )}
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-ink-soft hover:text-ink">Annuler</button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

    </div>
  )
}
