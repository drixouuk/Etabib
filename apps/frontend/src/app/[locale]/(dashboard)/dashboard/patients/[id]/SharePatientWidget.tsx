'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, X } from 'lucide-react'

type Doctor = { id: string; name: string; email: string }

type Props = { patientId: string; sharedWithIds: string[]; isClinique: boolean; currentUserId: string }

export default function SharePatientWidget({ patientId, sharedWithIds, isClinique, currentUserId }: Props) {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [shared, setShared] = useState<string[]>(sharedWithIds)

  useEffect(() => {
    if (!isClinique) return
    fetch('/api/cms-proxy/users?where[roles][contains]=doctor&depth=0&limit=50')
      .then(r => r.json())
      .then(j => setDoctors(j.docs?.filter((d: Doctor) => d.id !== currentUserId) ?? []))
  }, [isClinique, currentUserId])

  const share = async (doctorId: string) => {
    const newIds = [...shared, doctorId]
    setShared(newIds)
    await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith: newIds }),
    })
    router.refresh()
  }

  const unshare = async (doctorId: string) => {
    const newIds = shared.filter(id => id !== doctorId)
    setShared(newIds)
    await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith: newIds }),
    })
    router.refresh()
  }

  if (!isClinique) return null

  const sharedDoctors = doctors.filter(d => shared.includes(d.id))

  return (
    <div className="rounded-xl border border-warm bg-white shadow-warm-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-ink flex items-center gap-2">
          <Share2 className="size-4 text-ink-soft" /> Partage
        </h2>
      </div>
      <div className="px-4 py-3 space-y-2">
        {sharedDoctors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sharedDoctors.map(d => (
              <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                {d.name}
                <button onClick={() => unshare(d.id)} className="text-amber-400 hover:text-amber-600"><X className="size-3" /></button>
              </span>
            ))}
          </div>
        )}
        {doctors.filter(d => !shared.includes(d.id)).length > 0 && (
          <select value="" onChange={(e) => { if (e.target.value) share(e.target.value) }}
            className="rounded-lg border border-warm bg-white px-3 py-1.5 text-xs text-stone-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none">
            <option value="">+ Partager avec un confrère</option>
            {doctors.filter(d => !shared.includes(d.id)).map(d => (
              <option key={d.id} value={d.id}>{d.name} — {d.email}</option>
            ))}
          </select>
        )}
        {sharedDoctors.length === 0 && doctors.length === 0 && (
          <p className="text-xs text-ink-soft">Aucun confrère dans ce cabinet.</p>
        )}
      </div>
    </div>
  )
}
