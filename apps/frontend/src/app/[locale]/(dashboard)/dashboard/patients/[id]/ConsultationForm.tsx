'use client'

import { useState, useEffect, FormEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { DoctorInfo, PatientInfo } from '@/lib/generate-pdf'
import {
  enqueueConsultation,
  listQueue,
  subscribeQueue,
  flushQueue,
  SYNC_EVENT,
  newClientRequestId,
  type QueueEntry,
} from '@/lib/offline-queue'

type Consultation = {
  id: string
  date: string
  motif?: string | null
  examenClinique?: string | null
  practitioner: { email?: string; name?: string }
  poids?: number | null
  taille?: number | null
  perimetreCranien?: number | null
  diagnostic?: string | null
  codeActe?: string | null
}

type Props = {
  patientId: string
  consultations: Consultation[]
  isPediatrie?: boolean
  doctorInfo?: DoctorInfo
  patientInfo?: PatientInfo
  editingConsultation?: Consultation | null
  onClose: () => void
}

type Draft = {
  clientRequestId: string
  motif?: string
  examenClinique?: string
  poids?: string
  taille?: string
  perimetreCranien?: string
  diagnostic?: string
  codeActe?: string
  savedAt: number
}

export default function ConsultationForm({ patientId, consultations, isPediatrie, doctorInfo, patientInfo, editingConsultation, onClose }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [motif, setMotif] = useState(editingConsultation?.motif ?? '')
  const [examenClinique, setExamenClinique] = useState(editingConsultation?.examenClinique ?? '')
  const [poids, setPoids] = useState(editingConsultation?.poids ? String(editingConsultation.poids) : '')
  const [taille, setTaille] = useState(editingConsultation?.taille ? String(editingConsultation.taille) : '')
  const [perimetreCranien, setPerimetreCranien] = useState(editingConsultation?.perimetreCranien ? String(editingConsultation.perimetreCranien) : '')
  const [diagnostic, setDiagnostic] = useState(editingConsultation?.diagnostic ?? '')
  const [codeActe, setCodeActe] = useState(editingConsultation?.codeActe ?? '')
  const [error, setError] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showTemplateSave, setShowTemplateSave] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<{ id: string; name: string; motif?: string; examenClinique?: string; diagnostic?: string; codeActe?: string }[]>([])

  // --- SX-100 : idempotence + file persistante + brouillon local ---
  const draftKey = `draft:consultation:${patientId}:${editingConsultation?.id ?? 'new'}`
  const isNew = !editingConsultation

  // clientRequestId : généré une fois par brouillon, réutilisé à chaque
  // replay réseau de la même consultation (jamais régénéré à l'envoi).
  const [clientRequestId, setClientRequestId] = useState<string>(() => newClientRequestId())
  const [queued, setQueued] = useState(false)
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [authExpired, setAuthExpired] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState<Draft | null>(null)
  const [syncDone, setSyncDone] = useState(false)

  const getDraft = (): Draft | null => {
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? (JSON.parse(raw) as Draft) : null
    } catch {
      return null
    }
  }
  const saveDraft = useCallback(() => {
    if (!isNew) return
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ clientRequestId, motif, examenClinique, poids, taille, perimetreCranien, diagnostic, codeActe, savedAt: Date.now() } satisfies Draft),
      )
    } catch {
      // localStorage plein/indisponible : le brouillon n'est pas critique
    }
  }, [draftKey, isNew, clientRequestId, motif, examenClinique, poids, taille, perimetreCranien, diagnostic, codeActe])
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetch('/api/cms-proxy/templates?where[type][equals]=consultation&depth=0&limit=50')
      .then(r => r.json())
      .then(j => setTemplates(j.docs ?? []))
      .catch(() => {})
  }, [])

  // Reprise de brouillon : proposer explicitement, jamais écraser ni charger
  // silencieusement (SX-100 étape 4).
  useEffect(() => {
    if (!isNew) return
    const d = getDraft()
    if (d?.clientRequestId) {
      setClientRequestId(d.clientRequestId)
      setDraftPrompt(d)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave du brouillon : debounce 4s d'inactivité sur la frappe.
  useEffect(() => {
    if (!isNew || draftPrompt || saving) return
    const t = setTimeout(() => saveDraft(), 4000)
    return () => clearTimeout(t)
  }, [motif, examenClinique, poids, taille, perimetreCranien, diagnostic, codeActe, isNew, draftPrompt, saving, saveDraft])

  // État de la file persistante (indicateur en ligne / en attente).
  useEffect(() => {
    const refresh = async () => {
      const entries = await listQueue().catch(() => [])
      setQueueEntries(entries)
      setAuthExpired(entries.some(e => e.status === 'auth_expired'))
    }
    void refresh()
    return subscribeQueue(() => void refresh())
  }, [])

  const resumeDraft = () => {
    if (!draftPrompt) return
    setMotif(draftPrompt.motif ?? '')
    setExamenClinique(draftPrompt.examenClinique ?? '')
    setPoids(draftPrompt.poids ?? '')
    setTaille(draftPrompt.taille ?? '')
    setPerimetreCranien(draftPrompt.perimetreCranien ?? '')
    setDiagnostic(draftPrompt.diagnostic ?? '')
    setCodeActe(draftPrompt.codeActe ?? '')
    setDraftPrompt(null)
  }
  const discardDraft = () => {
    clearDraft()
    setClientRequestId(newClientRequestId())
    setDraftPrompt(null)
  }

  const retrySync = async () => {
    setSyncDone(false)
    const result = await flushQueue().catch(() => null)
    if (result && result.synced > 0 && result.authExpired === 0 && result.failed === 0) {
      setSyncDone(true)
      router.refresh()
    }
  }

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    const res = await fetch('/api/cms-proxy/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName.trim(),
        type: 'consultation',
        motif: motif || undefined,
        examenClinique: examenClinique || undefined,
        diagnostic: diagnostic || undefined,
        codeActe: codeActe || undefined,
      }),
    })
    if (res.ok) {
      const t = await fetch('/api/cms-proxy/templates?where[type][equals]=consultation&depth=0&limit=50')
      const j = await t.json()
      setTemplates(j.docs ?? [])
    }
    setShowTemplateSave(false)
    setTemplateName('')
    setSavingTemplate(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const body: Record<string, unknown> = {
      patient: patientId,
      motif: motif || undefined,
      examenClinique: examenClinique || undefined,
      poids: poids ? Number(poids) : undefined,
      taille: taille ? Number(taille) : undefined,
      perimetreCranien: perimetreCranien ? Number(perimetreCranien) : undefined,
      diagnostic: diagnostic || undefined,
      codeActe: codeActe || undefined,
    }

    // Édition : chemin direct existant (PATCH). L'idempotence SX-100 couvre
    // la création (clientRequestId) ; l'édition reste une mutation ponctuelle.
    if (editingConsultation) {
      const res = await fetch(`/api/cms-proxy/consultations/${editingConsultation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null)

      if (res && res.ok) {
        clearDraft()
        onClose()
        router.refresh()
      } else {
        setError("Erreur lors de l'enregistrement. Veuillez réessayer.")
      }
      setSaving(false)
      return
    }

    // Création : endpoint idempotent /upsert — le serveur insère directement
    // et retourne l'existant sur violation de contrainte unique (23505).
    const res = await fetch('/api/cms-proxy/consultations/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, clientRequestId }),
    }).catch(() => null)

    if (res && res.ok) {
      clearDraft()
      onClose()
      router.refresh()
      setSaving(false)
      return
    }

    // Échec réseau (fetch rejeté), erreur serveur (5xx) ou session expirée
    // (401) : la consultation part en file persistante avec le MÊME
    // clientRequestId — un replay ne créera pas de doublon.
    if (res === null || res.status >= 500 || res.status === 401) {
      if (res?.status === 401) {
        await enqueueConsultation({ payload: body, patientId, clientRequestId, status: 'auth_expired' })
        setAuthExpired(true)
      } else {
        await enqueueConsultation({ payload: body, patientId, clientRequestId })
      }
      setQueued(true)
      setSaving(false)
      return
    }

    // Autre erreur métier (validation 4xx) : afficher, ne pas mettre en file.
    setError("Erreur lors de l'enregistrement. Veuillez réessayer.")
    setSaving(false)
  }

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="font-heading text-base font-semibold text-stone-800">
        {editingConsultation ? 'Modifier la consultation' : 'Nouvelle consultation'}
      </h3>
      {draftPrompt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-stone-800">
            Reprendre le brouillon de {new Date(draftPrompt.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ?
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={resumeDraft}
              className="rounded-lg bg-primary-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-800">
              Reprendre
            </button>
            <button type="button" onClick={discardDraft} className="text-sm text-stone-600 hover:text-stone-800">
              Repartir d'un formulaire vide
            </button>
          </div>
        </div>
      )}
      {(queued || queueEntries.length > 0) && (
        <div className="flex flex-col gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3">
          <p className="text-sm font-medium text-stone-800">
            {queued ? 'Consultation mise en attente de synchronisation' : 'Hors ligne'} — {queueEntries.filter(e => e.status === 'pending').length} consultation(s) en file
          </p>
          {authExpired && (
            <p className="text-sm font-semibold text-red-700">
              Session expirée — reconnectez-vous pour synchroniser vos consultations en attente.
            </p>
          )}
          {queueEntries.filter(e => e.status === 'failed').length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-red-700">
                {queueEntries.filter(e => e.status === 'failed').length} consultation(s) en échec — synchronisation manuelle nécessaire.
              </p>
              <button type="button" onClick={retrySync}
                className="rounded-lg border border-sky-400 bg-white px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100">
                Réessayer la synchronisation
              </button>
            </div>
          )}
          {syncDone && <p className="text-sm font-medium text-emerald-700">Toutes les consultations sont synchronisées.</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find(tmpl => tmpl.id === e.target.value)
                  if (t) {
                    setMotif(t.motif || '')
                    setExamenClinique(t.examenClinique || '')
                    setDiagnostic(t.diagnostic || '')
                    setCodeActe(t.codeActe || '')
                  }
                }}
                className="rounded-lg border border-warm bg-white px-3 py-2 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Charger un modèle...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-800">Motif</label>
            <input value={motif} onChange={e => setMotif(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-800">Examen clinique</label>
            <textarea rows={4} value={examenClinique} onChange={e => setExamenClinique(e.target.value)} className={inputClass} />
          </div>
          <div className={`grid gap-4 ${isPediatrie ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-800">Poids (kg)</label>
              <input type="number" step="0.1" value={poids} onChange={e => setPoids(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-800">Taille (cm)</label>
              <input type="number" step="0.1" value={taille} onChange={e => setTaille(e.target.value)} className={inputClass} />
            </div>
            {isPediatrie && (
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-800">PC (cm)</label>
                <input type="number" step="0.1" value={perimetreCranien} onChange={e => setPerimetreCranien(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-800">Diagnostic</label>
            <textarea rows={3} value={diagnostic} onChange={e => setDiagnostic(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-800">Code acte (NGAP)</label>
            <input value={codeActe} onChange={e => setCodeActe(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
              {saving ? 'Enregistrement…' : editingConsultation ? 'Modifier la consultation' : 'Enregistrer la consultation'}
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
                  className="rounded-lg border border-warm bg-white px-3 py-2 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
                <button type="button" onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}
                  className="rounded-lg bg-cta-600 px-3 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
                  Enregistrer
                </button>
                <button type="button" onClick={() => { setShowTemplateSave(false); setTemplateName('') }}
                  className="text-sm text-stone-600 hover:text-stone-800">
                  Annuler
                </button>
              </div>
            )}
            <button type="button" onClick={onClose} className="text-sm text-stone-600 hover:text-stone-800">
              Annuler
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
    </div>
  )
}
