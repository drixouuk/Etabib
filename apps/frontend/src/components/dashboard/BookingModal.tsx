'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export type BookingDraft = {
  id?: string
  status: 'accepted' | 'pending' | 'cancelled' | 'rejected'
  startTime: string
  endTime: string
  duration: number
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  title: string
  location: string | null
}

type Props = {
  tenantId: string
  booking?: BookingDraft | null
  initialStart?: string | null
  onClose: () => void
  onSaved: () => void
}

const STATUS_LABELS: Record<BookingDraft['status'], string> = {
  accepted: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  rejected: 'Refusé',
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function BookingModal({ tenantId, booking, initialStart, onClose, onSaved }: Props) {
  const isEdit = !!booking?.id

  const initialStartLocal = (isEdit ? booking!.startTime : initialStart) || ''
  const initialStartDT = toDatetimeLocal(initialStartLocal)
  const defaultEndDT = isEdit ? toDatetimeLocal(booking!.endTime) : ''

  const [form, setForm] = useState(() => ({
    attendeeName: booking?.attendeeName || '',
    title: booking?.title || 'Consultation',
    start: initialStartDT || toDatetimeLocal(new Date().toISOString()),
    end: defaultEndDT,
    duration: booking?.duration || 30,
    status: booking?.status || 'accepted',
    attendeeEmail: booking?.attendeeEmail || '',
    attendeePhone: booking?.attendeePhone || '',
    location: booking?.location || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const startISO = form.start ? new Date(form.start).toISOString() : ''
  const endISO = form.end
    ? new Date(form.end).toISOString()
    : startISO
      ? new Date(new Date(startISO).getTime() + form.duration * 60000).toISOString()
      : ''

  const save = async (statusOverride?: BookingDraft['status']) => {
    setError('')
    if (!form.attendeeName.trim()) { setError('Le nom du patient est requis'); return }
    if (!form.start) { setError("La date et l'heure de début sont requises"); return }
    if (endISO && new Date(endISO) <= new Date(startISO)) { setError("La fin doit être après le début"); return }

    setSaving(true)
    const body: Record<string, unknown> = {
      attendeeName: form.attendeeName.trim(),
      title: form.title.trim() || 'Consultation',
      startTime: startISO,
      endTime: endISO,
      duration: form.duration,
      status: statusOverride || form.status,
      attendeeEmail: form.attendeeEmail.trim(),
      attendeePhone: form.attendeePhone.trim(),
      location: form.location.trim(),
    }
    if (!isEdit) {
      body.bookingUid = `manual-${crypto.randomUUID()}`
      body.eventTypeSlug = 'manual'
      body.tenant = tenantId
    }

    const res = await fetch(isEdit ? `/api/cms-proxy/calbookings/${booking!.id}` : '/api/cms-proxy/calbookings', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)

    if (res.ok) {
      onSaved()
      onClose()
      return
    }
    const data = await res.json().catch(() => null)
    const msg = data?.errors?.[0]?.message || "Erreur lors de l'enregistrement du rendez-vous"
    setError(/unique|already exists|déjà/i.test(msg) ? 'Ce créneau est déjà réservé.' : msg)
  }

  const cancelBooking = async () => {
    if (!booking?.id || !confirm('Annuler ce rendez-vous ?')) return
    setSaving(true)
    const res = await fetch(`/api/cms-proxy/calbookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Annulé par le cabinet' }),
    })
    setSaving(false)
    if (res.ok) {
      onSaved()
      onClose()
    } else {
      setError("Erreur lors de l'annulation")
    }
  }

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'
  const labelClass = 'mb-0.5 block text-xs text-stone-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-warm bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-stone-800">
            {isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-700" aria-label="Fermer">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Patient *</label>
            <input value={form.attendeeName} onChange={(e) => setForm({ ...form, attendeeName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Titre</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Début *</label>
            <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Fin</label>
            <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Durée (minutes)</label>
            <input
              type="number" min={5} step={5} value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || 30 })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as BookingDraft['status'] })}
              className={inputClass}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Email patient</label>
            <input type="email" value={form.attendeeEmail} onChange={(e) => setForm({ ...form, attendeeEmail: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Téléphone patient</label>
            <input type="tel" value={form.attendeePhone} onChange={(e) => setForm({ ...form, attendeePhone: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Localisation / lien visio</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} />
          </div>
        </div>

        {error && <p className="px-5 pb-1 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => save()}
              disabled={saving}
              className="rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cta-700 disabled:opacity-50"
            >
              {saving ? '…' : isEdit ? 'Enregistrer' : 'Créer le rendez-vous'}
            </button>
            <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-800">Fermer</button>
          </div>
          {isEdit && booking!.status !== 'cancelled' && (
            <button
              onClick={cancelBooking}
              disabled={saving}
              className="text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
            >
              Annuler le rendez-vous
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
