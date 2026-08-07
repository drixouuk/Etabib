'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Link } from '@/i18n/navigation'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <h1 className="font-heading text-4xl font-bold text-stone-800">
          Une erreur est survenue
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-500">
          Le service est temporairement indisponible. Veuillez réessayer dans
          quelques instants.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={reset}
            className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-primary-800"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-lg border border-stone-300 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-colors duration-200 hover:bg-cream-200"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
