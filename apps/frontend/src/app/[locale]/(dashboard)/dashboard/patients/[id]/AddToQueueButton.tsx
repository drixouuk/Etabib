'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'

type Props = {
  patientId: string
}

export default function AddToQueueButton({ patientId }: Props) {
  const router = useRouter()
  const [active, setActive] = useState<boolean | null>(null)
  const [reason, setReason] = useState('consultation')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/cms-proxy/queue-items?where[patient][equals]=${patientId}&where[status][in]=scheduled&where[status][in]=waiting&where[status][in]=in_consultation&limit=1`)
      .then(r => r.json())
      .then(j => setActive((j.docs?.length ?? 0) > 0))
      .catch(() => setActive(false))
  }, [patientId])

  if (active === null) return null
  if (active) return <p className="text-sm text-stone-600">Patient déjà en file d'attente active.</p>

  const handleAdd = async () => {
    setSaving(true)
    setError('')

    const res = await fetch('/api/cms-proxy/queue-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: patientId,
        status: 'waiting',
        visitReason: reason,
        arrivalTime: new Date().toISOString(),
      }),
    })

    if (!res.ok) {
      setError('Erreur lors de l\'ajout à la file')
      setSaving(false)
      return
    }

    setDone(true)
    router.refresh()
  }

  if (done) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        Patient ajouté à la file d'attente. <Link href="/dashboard/queue" className="underline">Voir la file d'attente</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-warm bg-stone-50 p-4">
      <div>
        <label htmlFor="visitReason" className="mb-1 block text-xs font-medium text-stone-600">
          Motif de visite
        </label>
        <select
          id="visitReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        >
          <option value="consultation">Consultation</option>
          <option value="controle">Contrôle</option>
          <option value="vaccin">Vaccin</option>
          <option value="urgence">Urgence</option>
        </select>
      </div>

      <button
        onClick={handleAdd}
        disabled={saving}
        className="rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50"
      >
        {saving ? 'Ajout…' : 'Ajouter à la file d\'attente du jour'}
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  )
}
