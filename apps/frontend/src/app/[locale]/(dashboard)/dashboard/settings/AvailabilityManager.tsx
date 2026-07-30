'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Slot = {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
  durationMinutes: number
  bufferMinutes: number
  isActive: boolean
}

const DAY_LABELS: Record<string, string> = {
  '1': 'Lundi', '2': 'Mardi', '3': 'Mercredi', '4': 'Jeudi',
  '5': 'Vendredi', '6': 'Samedi', '0': 'Dimanche',
}

export default function AvailabilityManager() {
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Slot | null>(null)
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [bufferMinutes, setBufferMinutes] = useState(15)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchSlots = () => {
    fetch('/api/cms-proxy/availability-slots?depth=0&limit=50')
      .then(r => r.json()).then(j => setSlots(j.docs ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { fetchSlots() }, [])

  const openNew = () => { resetForm(); setEditing(null); setShowForm(true) }
  const openEdit = (s: Slot) => {
    setDayOfWeek(s.dayOfWeek); setStartTime(s.startTime); setEndTime(s.endTime)
    setDurationMinutes(s.durationMinutes); setBufferMinutes(s.bufferMinutes); setIsActive(s.isActive)
    setEditing(s); setShowForm(true)
  }
  const resetForm = () => {
    setDayOfWeek('1'); setStartTime('09:00'); setEndTime('17:00')
    setDurationMinutes(30); setBufferMinutes(15); setIsActive(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const hasOverlap = !editing && slots.some(s =>
      s.dayOfWeek === dayOfWeek && s.isActive &&
      startTime < s.endTime && endTime > s.startTime
    )
    if (hasOverlap && !confirm('Une plage active existe déjà ce jour-là et se chevauche avec celle-ci. Continuer quand même ?')) {
      setSaving(false)
      return
    }
    const body = { dayOfWeek, startTime, endTime, durationMinutes, bufferMinutes, isActive }
    const url = editing ? `/api/cms-proxy/availability-slots/${editing.id}` : '/api/cms-proxy/availability-slots'
    const method = editing ? 'PATCH' : 'POST'
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.errors?.[0]?.message || data?.error || "Échec de l'enregistrement")
        setSaving(false)
        return
      }
      setShowForm(false)
      fetchSlots()
      router.refresh()
    } catch {
      setError('Impossible de contacter le serveur')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette plage ?')) return
    try {
      const res = await fetch(`/api/cms-proxy/availability-slots/${id}`, { method: 'DELETE' })
      if (!res.ok) { setError('Échec de la suppression'); return }
      fetchSlots(); router.refresh()
    } catch {
      setError('Impossible de contacter le serveur')
    }
  }

  const inputClass = 'w-full rounded-lg border border-warm bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

  if (loading) return <p className="text-sm text-stone-600">Chargement…</p>

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Disponibilités</h2>
        <button onClick={openNew} className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700"><Plus className="mr-1 inline size-3.5" />Ajouter</button>
      </div>
      {showForm && (
        <div className="space-y-3 border-b border-stone-100 bg-stone-50 p-4">
          {error && <p className="px-2 py-1 text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className={inputClass}>
              {Object.entries(DAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
              <span className="text-stone-600">&rarr;</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-600">Durée (min)</label>
              <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} min={15} max={120} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-stone-600">Pause (min)</label>
              <input type="number" value={bufferMinutes} onChange={e => setBufferMinutes(Number(e.target.value))} min={0} max={60} className={inputClass} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Actif
          </label>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-cta-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50">
              {saving ? '…' : editing ? 'Modifier' : 'Enregistrer'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-stone-600 hover:text-stone-800">Annuler</button>
          </div>
        </div>
      )}
      {slots.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-500">Aucune plage de disponibilité.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {slots.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-800">{DAY_LABELS[s.dayOfWeek]} &middot; {s.startTime}&ndash;{s.endTime}</p>
                <p className="text-xs text-stone-600">{s.durationMinutes}min &middot; pause {s.bufferMinutes}min{!s.isActive && ' · Inactive'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className="rounded p-1 text-stone-600 hover:text-primary-600"><Pencil className="size-3.5" /></button>
                <button onClick={() => handleDelete(s.id)} className="rounded p-1 text-stone-600 hover:text-red-600"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
