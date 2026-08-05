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
        <p className="text-sm font-medium text-destructive">Supprimer {patientName} ?</p>
        <p className="mt-1 text-xs text-muted-foreground">L'historique clinique (consultations, prescriptions, documents) sera définitivement perdu.</p>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={handleDelete} disabled={deleting}
            className="text-sm font-medium text-destructive hover:text-destructive disabled:opacity-50">
            {deleting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
          <button onClick={() => { setConfirming(false); setError('') }}
            className="text-sm text-muted-foreground hover:text-muted-foreground">
            Annuler
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors duration-200 hover:bg-muted"
    >
      <Trash2 className="size-3.5" />
      Supprimer
    </button>
  )
}
