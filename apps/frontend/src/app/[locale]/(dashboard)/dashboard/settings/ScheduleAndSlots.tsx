'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { TimeInput } from '@/components/ui/time-input'
import { nextOccurrenceDate, toDateKey } from '@/lib/rrule'

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
}

// dayOfWeek ISO (1=Lundi…7=Dimanche) → format availability-slots (0=Dimanche…6=Samedi)
const SLOT_DAY: Record<number, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '0' }

type ScheduleRow = { id?: string; dayOfWeek: number; open: string; close: string }

type Slot = {
  id?: string
  dayOfWeek: string
  startTime: string
  endTime: string
  durationMinutes: number
  bufferMinutes: number
  isActive: boolean
  // Récurrence (B3) — règle iCal optionnelle ; vide = hebdomadaire simple
  recurrenceRule?: string
  recurrenceEnd?: string
  exceptions?: string[]
}

type ScopeChoice = 'seul' | 'suivants' | 'serie'

type Closure = { id?: string; startDate: string; endDate?: string; label: string }

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'

export default function ScheduleAndSlots() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [customSlots, setCustomSlots] = useState(false)
  const [defaultDuration, setDefaultDuration] = useState(30)
  const [defaultBuffer, setDefaultBuffer] = useState(15)
  const [practiceId, setPracticeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [infoRes, slotsRes, tenantRes] = await Promise.all([
          fetch('/api/cms-proxy/practice-info?depth=0&limit=1'),
          fetch('/api/cms-proxy/availability-slots?depth=0&limit=100'),
          fetch('/api/cms-proxy/tenants?depth=0&limit=1'),
        ])
        const [info, slotsData, tenantData] = await Promise.all([infoRes.json(), slotsRes.json(), tenantRes.json()])
        const infoDoc = info.docs?.[0]
        if (infoDoc) {
          setPracticeId(infoDoc.id)
          setSchedules(
            (infoDoc.schedules ?? []).map((s: any) => ({
              id: s.id,
              dayOfWeek: Number(s.dayOfWeek) || 1,
              open: s.open || '08:00',
              close: s.close || '17:00',
            })),
          )
          setClosures(
            (infoDoc.exceptionalClosures ?? []).map((c: any) => ({
              id: c.id,
              startDate: (c.startDate || '').slice(0, 10),
              endDate: c.endDate ? c.endDate.slice(0, 10) : undefined,
              label: c.label,
            })),
          )
        }
        setSlots(
          (slotsData.docs ?? []).map((s: any) => ({
            id: s.id,
            dayOfWeek: String(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
            durationMinutes: s.durationMinutes ?? 30,
            bufferMinutes: s.bufferMinutes ?? 15,
            isActive: s.isActive ?? true,
            recurrenceRule: s.recurrenceRule ?? undefined,
            recurrenceEnd: s.recurrenceEnd ? String(s.recurrenceEnd).slice(0, 10) : undefined,
            exceptions: (s.exceptions ?? []).map((e: any) => String(e.date ?? '').slice(0, 10)),
          })),
        )
        const tenant = tenantData.docs?.[0]
        setCustomSlots(tenant?.settings?.customSlots ?? false)
        setDefaultDuration(tenant?.settings?.defaultSlotDuration ?? 30)
        setDefaultBuffer(tenant?.settings?.defaultSlotBuffer ?? 15)
      } catch {
        setError('Erreur de chargement des données')
      }
      setLoading(false)
    }
    load()
  }, [])

  const derivedSlots = (): Slot[] =>
    schedules
      .filter(s => s.dayOfWeek >= 1 && s.dayOfWeek <= 7 && s.open && s.close)
      .map(s => ({
        dayOfWeek: SLOT_DAY[s.dayOfWeek],
        startTime: s.open,
        endTime: s.close,
        durationMinutes: defaultDuration,
        bufferMinutes: defaultBuffer,
        isActive: true,
      }))

  const slotsEqual = (a: Slot, b: Slot) =>
    a.dayOfWeek === b.dayOfWeek && a.startTime === b.startTime && a.endTime === b.endTime &&
    a.durationMinutes === b.durationMinutes && a.bufferMinutes === b.bufferMinutes

  const checkConflicts = async (): Promise<number> => {
    try {
      const res = await fetch(
        `/api/cms-proxy/calbookings?where[status][equals]=accepted&where[startTime][greater_than]=${encodeURIComponent(new Date().toISOString())}&depth=0&limit=200`,
      )
      const data = await res.json()
      const bookings = data.docs ?? []
      const newSlots = derivedSlots()
      let conflicts = 0
      for (const b of bookings) {
        const d = new Date(b.startTime)
        const day = String(d.getDay())
        const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        const covered = newSlots.some(s => s.dayOfWeek === day && hm >= s.startTime && hm < s.endTime)
        if (!covered) conflicts++
      }
      return conflicts
    } catch {
      return 0
    }
  }

  const handleSaveSchedules = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const conflicts = await checkConflicts()
      if (conflicts > 0) {
        const ok = confirm(`⚠️ ${conflicts} rendez-vous sont planifiés en dehors de vos nouveaux horaires. Continuer ?`)
        if (!ok) { setSaving(false); return }
      }

      if (!practiceId) { setError('Aucune info cabinet trouvée'); setSaving(false); return }

      const infoRes = await fetch(`/api/cms-proxy/practice-info/${practiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: schedules.filter(s => s.dayOfWeek >= 1 && s.dayOfWeek <= 7 && s.open && s.close) }),
      })
      if (!infoRes.ok) throw new Error('Erreur horaires')

      if (!customSlots) {
        const newSlots = derivedSlots()
        for (const ns of newSlots) {
          const exists = slots.some(s => slotsEqual(s, ns))
          if (!exists) {
            await fetch('/api/cms-proxy/availability-slots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ns),
            })
          }
        }
        for (const old of slots) {
          const stillNeeded = newSlots.some(ns => slotsEqual(ns, old))
          if (!stillNeeded && old.id) {
            await fetch(`/api/cms-proxy/availability-slots/${old.id}`, { method: 'DELETE' })
          }
        }
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError("Erreur lors de l'enregistrement")
    }
    setSaving(false)
  }

  const saveCustomSlot = async (slot: Slot) => {
    const body = {
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: slot.durationMinutes,
      bufferMinutes: slot.bufferMinutes,
      isActive: slot.isActive,
      recurrenceRule: slot.recurrenceRule ?? null,
      recurrenceEnd: slot.recurrenceEnd ?? null,
      exceptions: (slot.exceptions ?? []).map((d) => ({ date: d })),
    }
    if (slot.id) {
      await fetch(`/api/cms-proxy/availability-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/cms-proxy/availability-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
  }

  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  // ---- B3 — portée de suppression d'un créneau récurrent -------------------
  // Série locale uniquement (pas de sync externe) : le choix de scope est
  // offert pour tout créneau portant une règle. Défaut = « ce créneau seul »,
  // l'option la moins destructive (une exception, la série continue).
  const [scopeDialog, setScopeDialog] = useState<{ index: number; scope: ScopeChoice; nextDate: string } | null>(null)

  const dayBefore = (key: string) => {
    const d = new Date(`${key}T00:00:00`)
    d.setDate(d.getDate() - 1)
    return toDateKey(d)
  }

  const confirmScopeDelete = async () => {
    const dlg = scopeDialog
    if (!dlg) return
    const slot = slots[dlg.index]
    if (!slot) return
    setScopeDialog(null)

    if (dlg.scope === 'serie') {
      if (slot.id) await fetch(`/api/cms-proxy/availability-slots/${slot.id}`, { method: 'DELETE' })
      setSlots(slots.filter((_, j) => j !== dlg.index))
      return
    }

    if (dlg.scope === 'seul') {
      // Exception (EXDATE) à la prochaine occurrence : la série continue.
      const exceptions = [...new Set([...(slot.exceptions ?? []), dlg.nextDate])]
      if (slot.id) {
        await fetch(`/api/cms-proxy/availability-slots/${slot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exceptions: exceptions.map((d) => ({ date: d })) }),
        })
      }
      setSlots(slots.map((s, j) => (j === dlg.index ? { ...s, exceptions } : s)))
      return
    }

    // « Ce créneau et les suivants » → troncature : fin de série la veille.
    const recurrenceEnd = dayBefore(dlg.nextDate)
    if (slot.id) {
      await fetch(`/api/cms-proxy/availability-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurrenceEnd }),
      })
    }
    setSlots(slots.map((s, j) => (j === dlg.index ? { ...s, recurrenceEnd } : s)))
  }

  const saveClosures = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      if (!practiceId) { setError('Aucune info cabinet trouvée'); setSaving(false); return }
      const res = await fetch(`/api/cms-proxy/practice-info/${practiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exceptionalClosures: closures.filter(c => c.startDate && c.label) }),
      })
      if (!res.ok) throw new Error('Erreur fermetures')
      setSuccess(true)
      router.refresh()
    } catch {
      setError("Erreur lors de l'enregistrement des fermetures")
    }
    setSaving(false)
  }

  if (loading) return <p className="text-sm text-stone-500">Chargement…</p>

  const displaySlots = customSlots ? slots : derivedSlots()

  return (
    <div className="space-y-8">
      {/* ===== Horaires d'ouverture ===== */}
      <div className="rounded-xl border border-warm bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h2 className="font-heading text-lg font-semibold text-stone-800">Horaires d&apos;ouverture · page vitrine</h2>
          <button onClick={handleSaveSchedules} disabled={saving}
            className="rounded-lg bg-cta-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50">
            {saving ? '…' : 'Enregistrer'}
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {schedules.length === 0 && <p className="text-sm text-stone-500">Aucun horaire défini.</p>}
          {schedules.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-warm bg-stone-50 p-3">
              <div className="min-w-[130px] flex-1">
                <label className="mb-0.5 block text-xs text-stone-600">Jour</label>
                <select
                  value={s.dayOfWeek}
                  onChange={e => setSchedules(schedules.map((r, j) => j === i ? { ...r, dayOfWeek: Number(e.target.value) } : r))}
                  className={inputClass}
                >
                  {Object.entries(DAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Ouverture</label>
                <TimeInput value={s.open} onChange={v => setSchedules(schedules.map((r, j) => j === i ? { ...r, open: v } : r))} className={inputClass} />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Fermeture</label>
                <TimeInput value={s.close} onChange={v => setSchedules(schedules.map((r, j) => j === i ? { ...r, close: v } : r))} className={inputClass} />
              </div>
              <button onClick={() => setSchedules(schedules.filter((_, j) => j !== i))} className="pb-1 text-xs text-red-500 hover:text-red-700">Retirer</button>
            </div>
          ))}
          <button onClick={() => setSchedules([...schedules, { dayOfWeek: 1, open: '08:00', close: '12:00' }])}
            className="self-start text-sm font-medium text-primary-600 hover:text-primary-700">
            <Plus className="mr-1 inline size-3.5" />Ajouter
          </button>

          {/* Toggle désynchronisation */}
          <label className="flex items-center gap-2 border-t border-stone-100 pt-3 text-sm text-stone-800">
            <input type="checkbox" checked={customSlots} onChange={e => setCustomSlots(e.target.checked)} />
            Créneaux de réservation différents des horaires
          </label>
        </div>
      </div>

      {/* ===== Créneaux de réservation ===== */}
      <div className="rounded-xl border border-warm bg-white shadow-sm">
        <div className="border-b border-stone-100 px-4 py-3">
          <h2 className="font-heading text-lg font-semibold text-stone-800">Créneaux de réservation</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {customSlots
              ? 'Gérés indépendamment des horaires.'
              : `Générés automatiquement depuis les horaires (durée ${defaultDuration} min, pause ${defaultBuffer} min).`}
          </p>
        </div>
        <div className={`flex flex-col gap-3 p-4 ${customSlots ? '' : 'opacity-70'}`}>
          {displaySlots.length === 0 && <p className="text-sm text-stone-500">Aucun créneau.</p>}
          {displaySlots.map((s, i) => (
            <div key={s.id ?? i} className={`flex flex-wrap items-end gap-2 rounded-lg border border-warm bg-stone-50 p-3 ${customSlots ? '' : 'pointer-events-none'}`}>
              <div className="min-w-[130px] flex-1">
                <label className="mb-0.5 block text-xs text-stone-600">Jour</label>
                <select
                  value={s.dayOfWeek}
                  disabled={!customSlots}
                  onChange={e => updateSlot(i, { dayOfWeek: e.target.value })}
                  className={inputClass}
                >
                  {Object.entries(DAY_LABELS).map(([k, v]) => <option key={k} value={SLOT_DAY[Number(k)]}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Début</label>
                <TimeInput value={s.startTime} disabled={!customSlots} onChange={v => updateSlot(i, { startTime: v })} className={inputClass} />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Fin</label>
                <TimeInput value={s.endTime} disabled={!customSlots} onChange={v => updateSlot(i, { endTime: v })} className={inputClass} />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Durée (min)</label>
                <input type="number" value={s.durationMinutes} disabled={!customSlots} onChange={e => updateSlot(i, { durationMinutes: Number(e.target.value) })} className={`${inputClass} w-20`} />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Pause (min)</label>
                <input type="number" value={s.bufferMinutes} disabled={!customSlots} onChange={e => updateSlot(i, { bufferMinutes: Number(e.target.value) })} className={`${inputClass} w-20`} />
              </div>
              {customSlots && (
                <>
                  {/* ---- B3 — récurrence (règle iCal FREQ=WEEKLY;BYDAY) ---- */}
                  <div className="w-full">
                    <label className="mb-0.5 flex items-center gap-1.5 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={!!s.recurrenceRule}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const letter = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][Number(s.dayOfWeek)]
                            updateSlot(i, { recurrenceRule: `FREQ=WEEKLY;BYDAY=${letter};INTERVAL=1` })
                          } else {
                            updateSlot(i, { recurrenceRule: undefined, recurrenceEnd: undefined, exceptions: [] })
                          }
                        }}
                      />
                      Répéter (plusieurs jours)
                    </label>
                    {s.recurrenceRule && (
                      <div className="mt-1.5 space-y-2 rounded-lg border border-warm bg-stone-50 p-2">
                        <div className="flex flex-wrap gap-1">
                          {(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const).map((d, idx) => {
                            const letters = s.recurrenceRule!.match(/BYDAY=([A-Z,]+)/)?.[1].split(',') ?? []
                            const checked = letters.includes(d)
                            const order = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  const next = checked ? letters.filter((x) => x !== d) : [...letters, d]
                                  if (next.length === 0) return
                                  if (next.length === 1) {
                                    // Un seul jour → retour au comportement hebdomadaire simple
                                    updateSlot(i, { recurrenceRule: undefined, dayOfWeek: String(order.indexOf(next[0])) })
                                  } else {
                                    const sorted = [...next].sort((a, b) => order.indexOf(a) - order.indexOf(b))
                                    updateSlot(i, { recurrenceRule: `FREQ=WEEKLY;BYDAY=${sorted.join(',')};INTERVAL=1` })
                                  }
                                }}
                                className={`rounded-full px-2 py-0.5 text-[11px] ${checked ? 'bg-primary-600 text-white' : 'border border-stone-300 bg-white text-stone-600'}`}
                              >
                                {DAY_LABELS[idx + 1]?.slice(0, 3)}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-[11px] text-stone-600">Fin de série</label>
                          <input
                            type="date"
                            value={s.recurrenceEnd ?? ''}
                            onChange={(e) => updateSlot(i, { recurrenceEnd: e.target.value || undefined })}
                            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="text-[11px] text-stone-600">Exceptions</label>
                          {(s.exceptions ?? []).map((ex) => (
                            <span key={ex} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                              {ex}
                              <button
                                type="button"
                                onClick={() => updateSlot(i, { exceptions: (s.exceptions ?? []).filter((x) => x !== ex) })}
                                aria-label="Retirer l'exception"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <input
                            type="date"
                            aria-label="Ajouter une exception"
                            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
                            onBlur={(e) => {
                              if (e.target.value) {
                                updateSlot(i, { exceptions: [...new Set([...(s.exceptions ?? []), e.target.value])] })
                                e.target.value = ''
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 pb-2 text-xs text-stone-600">
                    <input type="checkbox" checked={s.isActive} onChange={e => updateSlot(i, { isActive: e.target.checked })} />
                    Actif
                  </label>
                  <button
                    onClick={() => {
                      if (s.recurrenceRule) {
                        // B3 — série récurrente : choix de portée, défaut « seul »
                        setScopeDialog({ index: i, scope: 'seul', nextDate: nextOccurrenceDate(s, new Date()) })
                      } else {
                        if (s.id) fetch(`/api/cms-proxy/availability-slots/${s.id}`, { method: 'DELETE' })
                        setSlots(slots.filter((_, j) => j !== i))
                      }
                    }}
                    className="pb-1 text-xs text-red-500 hover:text-red-700">Supprimer</button>
                </>
              )}
            </div>
          ))}
          {customSlots && (
            <>
              <button
                onClick={() => setSlots([...slots, { dayOfWeek: '1', startTime: '08:00', endTime: '17:00', durationMinutes: defaultDuration, bufferMinutes: defaultBuffer, isActive: true }])}
                className="self-start text-sm font-medium text-primary-600 hover:text-primary-700">
                <Plus className="mr-1 inline size-3.5" />Ajouter un créneau
              </button>
              <button onClick={async () => { setSaving(true); setError(''); try { for (const s of slots) await saveCustomSlot(s); setSuccess(true); router.refresh() } catch { setError('Erreur sauvegarde créneaux') } setSaving(false) }}
                disabled={saving}
                className="self-start rounded-lg bg-cta-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50">
                {saving ? '…' : 'Enregistrer les créneaux'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---- B3 — portée de suppression d'une série récurrente ---- */}
      {scopeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setScopeDialog(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-base font-semibold text-stone-800">Supprimer ce créneau récurrent</h3>
            <p className="mt-1 text-xs text-stone-600">
              Ce créneau se répète. Prochaine occurrence : <b>{scopeDialog.nextDate || '—'}</b>
            </p>
            <label className="mt-3 block text-xs text-stone-600">Portée de la suppression</label>
            <select
              value={scopeDialog.scope}
              onChange={(e) => setScopeDialog({ ...scopeDialog, scope: e.target.value as ScopeChoice })}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="seul">Ce créneau seul (défaut)</option>
              <option value="suivants">Ce créneau et les suivants</option>
              <option value="serie">Toute la série</option>
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setScopeDialog(null)} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-700">
                Annuler
              </button>
              <button onClick={confirmScopeDelete} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Fermetures exceptionnelles ===== */}
      <div className="rounded-xl border border-warm bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h2 className="font-heading text-lg font-semibold text-stone-800">Fermetures exceptionnelles</h2>
          <button onClick={saveClosures} disabled={saving}
            className="rounded-lg bg-cta-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50">
            {saving ? '…' : 'Enregistrer'}
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          {closures.length === 0 && <p className="text-sm text-stone-500">Aucune fermeture exceptionnelle.</p>}
          {closures.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-warm bg-stone-50 p-3">
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Du</label>
                <input type="date" value={c.startDate} onChange={e => setClosures(closures.map((r, j) => j === i ? { ...r, startDate: e.target.value } : r))} className={inputClass} />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-stone-600">Au <span className="font-normal text-stone-400">(optionnel)</span></label>
                <input type="date" value={c.endDate || ''} onChange={e => setClosures(closures.map((r, j) => j === i ? { ...r, endDate: e.target.value || undefined } : r))} className={inputClass} />
              </div>
              <div className="min-w-[160px] flex-1">
                <label className="mb-0.5 block text-xs text-stone-600">Motif</label>
                <input value={c.label} onChange={e => setClosures(closures.map((r, j) => j === i ? { ...r, label: e.target.value } : r))} placeholder="Congés annuels" className={inputClass} />
              </div>
              <button onClick={() => setClosures(closures.filter((_, j) => j !== i))} className="pb-1 text-xs text-red-500 hover:text-red-700">Retirer</button>
            </div>
          ))}
          <button onClick={() => setClosures([...closures, { startDate: '', label: '' }])}
            className="self-start text-sm font-medium text-primary-600 hover:text-primary-700">
            <Plus className="mr-1 inline size-3.5" />Ajouter
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Enregistré.</p>}
    </div>
  )
}
