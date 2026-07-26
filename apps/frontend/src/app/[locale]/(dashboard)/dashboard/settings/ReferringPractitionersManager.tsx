'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Practitioner = { id: string; name: string; specialty?: string; phone?: string; city?: string; notes?: string }

export default function ReferringPractitionersManager() {
  const router = useRouter()
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Practitioner | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState(''); const [specialty, setSpecialty] = useState(''); const [phone, setPhone] = useState(''); const [city, setCity] = useState(''); const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')

  const fetchAll = () => { fetch('/api/cms-proxy/referring-practitioners?depth=0&limit=200').then(r => r.json()).then(j => setPractitioners(j.docs ?? [])).finally(() => setLoading(false)) }
  useEffect(() => { fetchAll() }, [])

  const resetForm = () => { setName(''); setSpecialty(''); setPhone(''); setCity(''); setNotes(''); setError('') }
  const openNew = () => { resetForm(); setEditing(null); setShowNew(true) }
  const openEdit = (p: Practitioner) => { setName(p.name); setSpecialty(p.specialty || ''); setPhone(p.phone || ''); setCity(p.city || ''); setNotes(p.notes || ''); setEditing(p); setShowNew(true) }
  const cancel = () => { setShowNew(false); setEditing(null); resetForm() }

  const handleSave = async () => {
    if (!name.trim()) { setError('Nom requis'); return }
    setSaving(true); setError('')
    const body = { name: name.trim(), specialty: specialty.trim() || undefined, phone: phone.trim() || undefined, city: city.trim() || undefined, notes: notes.trim() || undefined }
    const url = editing ? `/api/cms-proxy/referring-practitioners/${editing.id}` : '/api/cms-proxy/referring-practitioners'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { cancel(); fetchAll(); router.refresh() }
    else { setError('Erreur lors de l\'enregistrement') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce praticien ?')) return
    await fetch(`/api/cms-proxy/referring-practitioners/${id}`, { method: 'DELETE' })
    fetchAll(); router.refresh()
  }

  const inputClass = 'w-full rounded-lg border border-warm bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

  if (loading) return <p className="text-sm text-stone-400">Chargement…</p>

  return (
    <div className="rounded-xl border border-warm bg-white shadow-warm-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Médecins référents</h2>
        <button onClick={openNew} className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800"><Plus className="size-3.5 inline mr-1" />Ajouter</button>
      </div>
      {showNew && (
        <div className="border-b border-stone-100 p-4 space-y-3 bg-stone-50">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom *" className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Spécialité" className={inputClass} />
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ville" className={inputClass} />
          </div>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className={inputClass} />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className={inputClass} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {saving ? '…' : editing ? 'Modifier' : 'Ajouter'}
            </button>
            <button onClick={cancel} className="text-xs text-stone-500 hover:text-stone-700">Annuler</button>
          </div>
        </div>
      )}
      {practitioners.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-400">Aucun médecin référent enregistré.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {practitioners.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">{p.name}</p>
                <p className="text-xs text-stone-500">{[p.specialty, p.city, p.phone].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => openEdit(p)} className="rounded p-1 text-stone-400 hover:text-primary-600"><Pencil className="size-3.5" /></button>
                <button onClick={() => handleDelete(p.id)} className="rounded p-1 text-stone-400 hover:text-red-600"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
