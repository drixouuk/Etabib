'use client'

import { useEffect, useRef, useState } from 'react'
import { User, Cake, Phone, Mail, IdCard, MapPin, X, Pencil, type LucideIcon } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Link } from '@/i18n/navigation'
import { computeAge } from '@/lib/age'

export type PatientRow = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  nationalId?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
}

type Props = {
  patient: PatientRow
  onClose: () => void
}

type Row = { icon: LucideIcon; label: string; value?: string | null; href?: string }

/**
 * « Look first, edit second » (B1) : vue lecture seule du patient — aucun
 * champ de saisie (le clavier ne peut pas s'ouvrir). « Modifier » mène au
 * formulaire existant (/edit). Jeton d'ancienneté : la réponse du fetch
 * d'actualisation se jette si la vue a été remplacée entre-temps.
 */
export function PatientDetailView({ patient, onClose }: Props) {
  const [fresh, setFresh] = useState<PatientRow | null>(null)
  const viewSeq = useRef(0)

  useEffect(() => {
    const token = ++viewSeq.current
    let cancelled = false
    fetch(`/api/cms-proxy/patients/${patient.id}?depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (doc && !cancelled && viewSeq.current === token) setFresh(doc)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      viewSeq.current++ // vue fermée : toute réponse tardive devient caduque
    }
  }, [patient.id])

  const p = fresh ?? patient
  const rows: Row[] = [
    { icon: Cake, label: 'Âge', value: p.birthDate ? computeAge(p.birthDate) : null },
    { icon: Cake, label: 'Naissance', value: p.birthDate ? new Date(p.birthDate).toLocaleDateString('fr-FR') : null },
    { icon: IdCard, label: 'CIN', value: p.nationalId },
    { icon: Phone, label: 'Téléphone', value: p.phone, href: p.phone ? `tel:${p.phone}` : undefined },
    { icon: Mail, label: 'Email', value: p.email, href: p.email ? `mailto:${p.email}` : undefined },
    { icon: MapPin, label: 'Adresse', value: p.address },
  ]

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <User className="size-5 text-primary-700" aria-hidden="true" />
            <div>
              <h2 className="font-heading text-lg font-semibold text-stone-800">{p.fullName}</h2>
              <p className="text-xs text-stone-500">Dossier patient</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-700" aria-label="Fermer">
            <X className="size-4" />
          </button>
        </div>

        <div className="divide-y divide-stone-100 px-5">
          {rows.filter((r) => r.value).map((r) => (
            <div key={r.label} className="flex items-center gap-3 py-3">
              <r.icon className="size-4 shrink-0 text-stone-400" aria-hidden="true" />
              <span className="w-28 shrink-0 text-xs text-stone-500">{r.label}</span>
              {r.href ? (
                <a href={r.href} className="text-sm font-medium text-primary-700 hover:underline">{r.value}</a>
              ) : (
                <span className="text-sm text-stone-800">{r.value}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/patients/${p.id}/edit`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cta-700"
            >
              <Pencil className="size-3.5" /> Modifier
            </Link>
            <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-800">Fermer</button>
          </div>
          <Link href={`/dashboard/patients/${p.id}`} onClick={onClose} className="text-sm text-primary-700 hover:underline">
            Dossier complet
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
