'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

type Practitioner = { id: string; name: string; specialty?: string; city?: string }

type Props = { patientId: string; initialIds: string[] }

export default function ReferringPractitionersWidget({ patientId, initialIds }: Props) {
  const router = useRouter()
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cms-proxy/referring-practitioners?depth=0&limit=200')
      .then(r => r.json())
      .then(j => setPractitioners(j.docs ?? []))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (practId: string) => {
    const newIds = selectedIds.includes(practId)
      ? selectedIds.filter(id => id !== practId)
      : [...selectedIds, practId]
    setSelectedIds(newIds)
    await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referringPractitioners: newIds }),
    })
    router.refresh()
  }

  if (loading) return <p className="text-xs text-stone-600">Chargement…</p>

  const selected = practitioners.filter(p => selectedIds.includes(p.id))
  const available = practitioners.filter(p => !selectedIds.includes(p.id))

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(p => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              {p.name}{p.specialty ? ` (${p.specialty})` : ''}
              <button onClick={() => toggle(p.id)} className="ml-0.5 text-primary-400 hover:text-primary-600"><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <select value="" onChange={(e) => { if (e.target.value) toggle(e.target.value) }}
          className="w-full rounded-lg border border-warm bg-white px-3 py-1.5 text-xs text-stone-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
          <option value="">+ Ajouter un médecin référent</option>
          {available.map(p => (
            <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ''}{p.city ? ` (${p.city})` : ''}</option>
          ))}
        </select>
      )}
      {practitioners.length === 0 && <p className="text-xs text-stone-600">Aucun médecin référent enregistré.</p>}
    </div>
  )
}
