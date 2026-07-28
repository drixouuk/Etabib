'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import ScheduleXCalendar from '@/components/dashboard/ScheduleXCalendar'

const WORK_HOURS = { start: 9, end: 17 }
const SLOT_DURATION = 30
const WORK_DAYS = [1, 2, 3, 4, 5, 6]

function generateSlots(dateStr: string): string[] {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  if (!WORK_DAYS.includes(dayOfWeek)) return []

  const slots: string[] = []
  for (let h = WORK_HOURS.start; h < WORK_HOURS.end; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      const hour = String(h).padStart(2, '0')
      const min = String(m).padStart(2, '0')
      slots.push(`${hour}:${min}`)
    }
  }
  return slots
}

type Props = { tenantId: string }

export default function PublicBookingWidget({ tenantId }: Props) {
  const t = useTranslations('rdv')
  const [step, setStep] = useState<'calendar' | 'slots' | 'form' | 'done'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    const slots = generateSlots(date)
    setAvailableSlots(slots)
    setStep('slots')
  }

  const handleSlotClick = (slot: string) => {
    setSelectedSlot(slot)
    setStep('form')
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Nom requis'); return }
    setSaving(true)
    setError('')
    try {
      const datePart = selectedDate!.split('T')[0]
      const startTime = `${datePart}T${selectedSlot}:00`
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), startTime, tenantId }),
      })
      if (res.ok) {
        setStep('done')
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la réservation')
      }
    } catch {
      setError('Impossible de contacter le serveur')
    }
    setSaving(false)
  }

  return (
    <section className="scroll-mt-24 bg-gradient-to-b from-cream-100 to-white px-4 py-20 md:px-6 md:py-28 lg:px-8">
      <div className="mx-auto max-w-container">
        <h2 className="text-center font-heading text-3xl font-bold text-stone-800 md:text-4xl">{t('title')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-lg text-stone-500">{t('subtitle')}</p>
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {step === 'calendar' && (
            <ScheduleXCalendar events={[]} onDateClick={handleDateClick} />
          )}

          {step === 'slots' && selectedDate && (
            <div>
              <p className="mb-4 text-sm text-stone-500">
                Choisissez un créneau pour le {new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Casablanca', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedDate))}
              </p>
              {availableSlots.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-stone-400">Aucun créneau disponible ce jour-là.</p>
                  <button onClick={() => setStep('calendar')} className="mt-4 text-sm text-primary-600 hover:text-primary-700">Choisir une autre date</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availableSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => handleSlotClick(slot)}
                      className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors duration-200 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
              {availableSlots.length > 0 && (
                <button onClick={() => setStep('calendar')} className="mt-4 text-sm text-stone-500 hover:text-stone-700">
                  Choisir une autre date
                </button>
              )}
            </div>
          )}

          {step === 'form' && selectedDate && selectedSlot && (
            <div className="space-y-4">
              <p className="text-sm text-stone-500">
                Créneau : {new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Casablanca', day: 'numeric', month: 'long' }).format(new Date(selectedDate))} à {selectedSlot}
              </p>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet *" className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
                  {saving ? 'Réservation…' : 'Confirmer le rendez-vous'}
                </button>
                <button onClick={() => setStep('slots')} className="rounded-lg border border-stone-200 bg-white px-6 py-2.5 text-sm">Retour</button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <p className="text-lg font-medium text-primary-700">Rendez-vous confirmé !</p>
              <p className="mt-2 text-sm text-stone-500">Vous recevrez une confirmation par email.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
