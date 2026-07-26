'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

type Props = {
  patientId: string
  patientName: string
}

export default function PatientDeleteButton({ patientId, patientName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')

    const res = await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      setError('Erreur lors de la suppression')
      setDeleting(false)
      return
    }

    setConfirming(false)
    setDeleting(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-red-700">Supprimer {patientName} ?</p>
        <p className="mt-1 text-xs text-ink-soft">L'historique clinique (consultations, prescriptions, documents) sera définitivement perdu.</p>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={handleDelete} disabled={deleting}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
            {deleting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
          <button onClick={() => { setConfirming(false); setError('') }}
            className="text-sm text-ink-softer hover:text-stone-600">
            Annuler
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink transition-colors duration-200 hover:bg-stone-50"
    >
      <Trash2 className="size-3.5" />
      Supprimer
    </button>
  )
}
