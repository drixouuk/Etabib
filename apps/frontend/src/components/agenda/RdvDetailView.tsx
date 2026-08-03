'use client'

import { useCallback, useRef, useState } from 'react'
import { User, Clock, Timer, Phone, Mail, MapPin, Repeat, X, Pencil, type LucideIcon } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { BookingForm, type BookingDraft } from '@/components/dashboard/BookingSheet'
import { describeRRule } from '@/lib/rrule'

export type RdvDetail = {
  id: string
  status: BookingDraft['status']
  startTime: string
  endTime: string
  duration: number
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  title: string
  location: string | null
  recurrenceRule?: string | null
}

type Props = {
  tenantId: string
  booking: RdvDetail
  whenLabel?: string | null
  onClose: () => void
  onSaved: () => void
  onToast?: (message: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  rejected: 'Refusé',
}

function formatRange(start: string, end?: string | null): string {
  const s = new Date(start)
  const e = end ? new Date(end) : null
  if (Number.isNaN(s.getTime())) return ''
  const time = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${s.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${time(s)}${e && !Number.isNaN(e.getTime()) ? ` – ${time(e)}` : ''}`
}

type Row = { icon: LucideIcon; label: string; value?: string | null; href?: string }

/**
 * « Look first, edit second » (B1) : la vue lecture ne contient AUCUN champ de
 * saisie — le clavier mobile ne peut structurellement pas s'ouvrir. « Modifier »
 * monte le formulaire à ce moment-là seulement ; au retour le formulaire reste
 * monté et le header dit « Retour ». Les actions de footer ferment en force
 * (pas de confirmation « abandonner les modifications ? » — règle #625 yuvomi).
 */
export function RdvDetailView({ tenantId, booking, whenLabel, onClose, onSaved, onToast }: Props) {
  const [mode, setMode] = useState<'detail' | 'form'>('detail')
  const [formMounted, setFormMounted] = useState(false)
  // Données fraîches après sauvegarde ; la vue lit `fresh ?? booking`.
  const [fresh, setFresh] = useState<RdvDetail | null>(null)

  // Jeton d'ancienneté : une réponse async tardive se jette si la vue a été
  // remplacée (autre RDV ouvert, ou fermeture pendant le fetch).
  const viewSeq = useRef(0)

  const openForm = () => {
    setFormMounted(true)
    setMode('form')
  }

  const handleSaved = useCallback(() => {
    onSaved()
    const token = ++viewSeq.current
    setMode('detail')
    const reload = async () => {
      try {
        const res = await fetch(`/api/cms-proxy/calbookings/${booking.id}?depth=0`)
        if (!res.ok) return
        const doc = await res.json()
        if (viewSeq.current !== token) return // vue remplacée → jeter la réponse
        setFresh(doc)
      } catch {
        /* silencieux : la vue garde les données initiales */
      }
    }
    void reload()
  }, [onSaved, booking.id])

  const handleCancel = async () => {
    if (!confirm('Annuler ce rendez-vous ?')) return
    const res = await fetch(`/api/cms-proxy/calbookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Annulé depuis le dossier' }),
    })
    if (res.ok) {
      onToast?.('Rendez-vous annulé')
      onSaved()
      onClose() // fermeture en force : aucun dialogue d'abandon
    } else {
      onToast?.("Erreur lors de l'annulation")
    }
  }

  const b = fresh ?? booking
  const rows: Row[] = [
    { icon: User, label: 'Patient', value: b.attendeeName },
    { icon: Clock, label: 'Quand', value: formatRange(b.startTime, b.endTime) },
    { icon: Timer, label: 'Durée', value: b.duration ? `${b.duration} min` : null },
    { icon: Repeat, label: 'Répétition', value: describeRRule(b.recurrenceRule) },
    { icon: Phone, label: 'Téléphone', value: b.attendeePhone, href: b.attendeePhone ? `tel:${b.attendeePhone}` : undefined },
    { icon: Mail, label: 'Email', value: b.attendeeEmail, href: b.attendeeEmail ? `mailto:${b.attendeeEmail}` : undefined },
    { icon: MapPin, label: 'Lieu', value: b.location },
  ]

  return (
    <Sheet open onOpenChange={(o) => { if (!o) { if (mode === 'form') setMode('detail'); else onClose() } }}>
      <SheetContent side="right" className="w-full sm:!max-w-[50vw] overflow-y-auto">
        {mode === 'detail' ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-stone-800">{b.title || 'Rendez-vous'}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-600 capitalize">
                  <Clock className="size-3" />
                  {whenLabel || formatRange(b.startTime, b.endTime)}
                </p>
              </div>
              <button onClick={onClose} className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-700" aria-label="Fermer">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-stone-100 bg-primary-50/60 px-5 py-3">
              <User className="size-4 text-primary-700" />
              <span className="text-sm font-semibold text-stone-800">{b.attendeeName}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-stone-600">{STATUS_LABELS[b.status] ?? b.status}</span>
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
                <button
                  onClick={openForm}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cta-700"
                >
                  <Pencil className="size-3.5" /> Modifier
                </button>
                <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-800">Fermer</button>
              </div>
              {b.status !== 'cancelled' && (
                <button onClick={handleCancel} className="text-sm font-medium text-red-600 transition-colors hover:text-red-700">
                  Annuler le rendez-vous
                </button>
              )}
            </div>
          </>
        ) : formMounted ? (
          <BookingForm
            tenantId={tenantId}
            booking={booking as BookingDraft}
            initialStart={null}
            whenLabel={whenLabel}
            onBack={() => setMode('detail')}
            onClose={onClose}
            onSaved={handleSaved}
            onToast={onToast}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
