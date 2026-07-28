'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

const WORK_HOURS = { start: 9, end: 17 }
const SLOT_DURATION = 30
const WORK_DAYS = [1, 2, 3, 4, 5, 6]
const FR_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function generateWeekDays(month: Date): { num: number; iso: string; available: boolean }[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1)
  const lastDay = new Date(year, m + 1, 0)
  const days: { num: number; iso: string; available: boolean }[] = []

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, m, d)
    const dayOfWeek = date.getDay()
    const available = WORK_DAYS.includes(dayOfWeek) && date >= new Date(new Date().toDateString())
    const iso = date.toISOString().split('T')[0]
    days.push({ num: d, iso, available })
  }
  return days
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = WORK_HOURS.start; h < WORK_HOURS.end; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

type Props = { tenantId: string }

export default function PublicBookingWidget({ tenantId }: Props) {
  const t = useTranslations('rdv')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const days = generateWeekDays(currentMonth)

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Nom requis'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), startTime: `${selectedDate}T${selectedTime}:00`, tenantId }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la réservation')
      }
    } catch {
      setError('Impossible de contacter le serveur')
    }
    setSaving(false)
  }

  const monthLabel = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <section id="rdv" className="scroll-mt-24 border-y border-stone-200 bg-white px-4 py-[88px] md:py-[60px]">
      <div className="container mx-auto max-w-[1200px]">
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
            {t('title')}
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
            {t('title')}
          </h2>
          <p className="mt-2.5 text-stone-600">{t('subtitle')}</p>
        </div>

        {done ? (
          <div className="mx-auto max-w-[640px] rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-md">
            <p className="text-lg font-semibold text-primary-700">Rendez-vous confirmé !</p>
            <p className="mt-2 text-sm text-stone-500">Vous recevrez une confirmation par email.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-[640px] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-md">
            <div className="flex items-center justify-between border-b border-stone-200 px-[22px] py-[18px]">
              <button onClick={prevMonth} className="flex size-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500">
                <ChevronLeft className="size-3.5" />
              </button>
              <strong className="font-heading text-[.98rem] text-stone-800 capitalize">{monthLabel}</strong>
              <button onClick={nextMonth} className="flex size-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500">
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 px-[22px] py-[18px]">
              {FR_DAYS.map((d, i) => (
                <div key={i} className="text-center text-[.7rem] font-bold uppercase text-stone-400">{d}</div>
              ))}
              {days.map((day, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedDate(day.iso); setSelectedTime(null) }}
                  disabled={!day.available}
                  className={`aspect-square rounded-[10px] flex items-center justify-center text-[.82rem] font-semibold transition-colors ${
                    day.iso === selectedDate ? 'bg-primary-600 text-white' :
                    day.available ? 'border border-primary-200 bg-primary-50 text-primary-700 cursor-pointer hover:bg-primary-100' :
                    'bg-cream-200 text-stone-400 cursor-default'
                  }`}>
                  {day.num}
                </button>
              ))}
            </div>

            {selectedDate && (
              <div className="flex flex-wrap gap-2.5 px-[22px] py-1 pb-[22px]">
                {generateTimeSlots().map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-full border px-[14px] py-2 text-[.83rem] font-semibold transition-colors ${
                      time === selectedTime ? 'bg-primary-600 border-primary-600 text-white' :
                      'border-stone-200 bg-white text-stone-600 hover:border-primary-300'
                    }`}>
                    {time}
                  </button>
                ))}
              </div>
            )}

            {selectedDate && selectedTime && (
              <div className="border-t border-stone-200 px-[22px] py-[18px] space-y-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet *"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button onClick={handleSubmit} disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cta-700 py-3.5 text-[.95rem] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-800">
                  {saving ? 'Réservation…' : `Confirmer le ${new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${selectedTime}`}
                  {!saving && <ArrowRight className="size-[17px]" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
