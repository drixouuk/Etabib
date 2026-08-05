'use client'

import { useEffect } from 'react'
import { Calendar } from 'lucide-react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RendezVousError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[rendez-vous] error boundary caught:', error)
  }, [error])

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">Rendez-vous</h1>
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16 text-center shadow-sm">
        <Calendar className="size-12 text-muted-foreground/70" />
        <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">
          Impossible de charger le calendrier
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Une erreur est survenue lors du chargement du calendrier. Cela peut être
          temporaire.
        </p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground break-all">
          {error.message || 'Erreur inconnue'}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-800"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
