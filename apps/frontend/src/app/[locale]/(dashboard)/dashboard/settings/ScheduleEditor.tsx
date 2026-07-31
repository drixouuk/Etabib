'use client'

import { useState, useEffect } from 'react'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

export default function ScheduleEditor() {
  const [schedules, setSchedules] = useState<{ day: string; open: string; close: string }[]>([])
  const [practiceId, setPracticeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/cms-proxy/practice-info?depth=0&limit=1')
      .then(r => r.json())
      .then(j => {
        const doc = j.docs?.[0]
        if (doc) {
          setPracticeId(doc.id)
          setSchedules(doc.schedules?.length ? doc.schedules.map((s: any) => ({ day: s.day, open: s.open || '', close: s.close || '' })) : [])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const addRow = () => setSchedules([...schedules, { day: '', open: '', close: '' }])
  const removeRow = (i: number) => setSchedules(schedules.filter((_, j) => j !== i))
  const update = (i: number, field: string, value: string) => {
    setSchedules(schedules.map((s, j) => j === i ? { ...s, [field]: value } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    if (!practiceId) { setError('Aucune info cabinet trouvée'); setSaving(false); return }
    const res = await fetch(`/api/cms-proxy/practice-info/${practiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules: schedules.filter(s => s.day.trim()) }),
    })
    if (res.ok) setSuccess(true)
    else setError("Erreur lors de l'enregistrement")
    setSaving(false)
  }

  if (loading) return <p className="text-sm text-stone-500">Chargement…</p>

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Horaires d'ouverture · page vitrine</h2>
        <button onClick={addRow} className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700">Ajouter</button>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {schedules.length === 0 && <p className="text-sm text-stone-500">Aucun horaire défini.</p>}
        {schedules.map((s, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-warm bg-stone-50 p-3">
            <div className="min-w-[130px] flex-1">
              <label className="mb-0.5 block text-xs text-stone-600">Jour</label>
              <select value={s.day} onChange={e => update(i, 'day', e.target.value)} className={inputClass}>
                <option value="">—</option>
                {DAYS_FR.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-stone-600">Ouverture</label>
              <input type="time" value={s.open} onChange={e => update(i, 'open', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-stone-600">Fermeture</label>
              <input type="time" value={s.close} onChange={e => update(i, 'close', e.target.value)} className={inputClass} />
            </div>
            <button onClick={() => removeRow(i)} className="text-xs text-red-500 hover:text-red-700 pb-1">Retirer</button>
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Enregistré.</p>}
        {schedules.length > 0 && (
          <button onClick={handleSave} disabled={saving} className="self-start rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
            {saving ? '…' : 'Enregistrer'}
          </button>
        )}
      </div>
    </div>
  )
}
