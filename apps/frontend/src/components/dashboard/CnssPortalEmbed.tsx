'use client'

// Portail CNSS (FSE) — accès direct depuis le dashboard.
// L'embeddabilité (X-Frame-Options / CSP) est testée côté serveur via
// /api/cnss-portal : iframe si autorisé, sinon ouverture en nouvel onglet
// (résultat attendu pour un portail gouvernemental, pas un échec).
// AUCUNE donnée patient n'est transmise au portail (pas de pré-remplissage,
// pas de postMessage) — le libellé explicite qu'il s'agit d'un portail
// externe, pas d'une intégration automatisée.

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CNSS_PORTAL_URL } from '@/lib/brand'

export default function CnssPortalEmbed() {
  const [embeddable, setEmbeddable] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/cnss-portal')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEmbeddable(!!data?.embeddable)
      })
      .catch(() => {
        if (!cancelled) setEmbeddable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openInNewTab = () => {
    window.open(CNSS_PORTAL_URL, '_blank', 'noopener,noreferrer')
  }

  // Pendant le check (ou si non embeddable) : bouton d'ouverture directe.
  if (embeddable !== true) {
    return (
      <button
        type="button"
        onClick={openInNewTab}
        title="Portail CNSS externe — aucune donnée patient n'est transmise, pas d'intégration automatisée"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-warm bg-white px-3 text-xs font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50"
      >
        <ExternalLink className="size-3.5" />
        Portail CNSS (FSE)
      </button>
    )
  }

  return (
    <Sheet>
      <SheetTrigger
        title="Portail CNSS externe — aucune donnée patient n'est transmise, pas d'intégration automatisée"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-warm bg-white px-3 text-xs font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50"
      >
        <ExternalLink className="size-3.5" />
        Portail CNSS (FSE)
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[640px]">
        <SheetHeader className="border-b border-stone-100 px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-[15px] font-semibold text-stone-800">
            <ExternalLink className="size-4 text-primary-600" />
            Portail CNSS (FSE)
          </SheetTitle>
          <p className="text-xs text-stone-500">
            Portail externe de la CNSS — aucune donnée patient n&apos;est transmise. Si le portail ne s&apos;affiche pas,
            ouvrez-le dans un nouvel onglet.
          </p>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <iframe
            src={CNSS_PORTAL_URL}
            className="h-full w-full flex-1"
            title="Portail CNSS des professionnels de santé (FSE)"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          />
          <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3">
            <span className="text-xs text-stone-500">Le portail refuse l&apos;affichage intégré ?</span>
            <button
              type="button"
              onClick={openInNewTab}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              <ExternalLink className="size-3.5" />
              Ouvrir dans un nouvel onglet
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
