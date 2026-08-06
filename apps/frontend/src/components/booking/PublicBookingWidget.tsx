'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import Turnstile, { type TurnstileHandle } from '@/components/ui/Turnstile'

const FR_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type DayAvail = { iso: string; dayOfWeek: number; available: boolean; times: string[] }

type Props = { tenantId: string }

export default function PublicBookingWidget({ tenantId }: Props) {
  const t = useTranslations('rdv')
  const locale = useLocale()
  const tid = parseInt(tenantId, 10)
  const isAvailable = !!tid

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [days, setDays] = useState<DayAvail[]>([])
  const [loading, setLoading] = useState(true)
  const [practicePhone, setPracticePhone] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)

  // Point 3 — l'état indisponible propose immédiatement le téléphone du cabinet.
  useEffect(() => {
    fetch(`/api/cms-proxy/practice-info?where[tenant.id][equals]=${tid}&depth=0&limit=1`)
      .then(r => r.json())
      .then(d => { const p = d?.docs?.[0]; if (p?.phone) setPracticePhone(String(p.phone)) })
      .catch(() => {})
  }, [tid])

  const fetchWeek = useCallback(() => {
    setLoading(true)
    setSelectedDate(null)
    setSelectedTime(null)
    const iso = toLocalISODate(weekStart)
    fetch(`/api/bookings/week-availability?tenantId=${tenantId}&weekStart=${iso}`)
      .then(r => r.json())
      .then(data => setDays(data.days ?? []))
      .finally(() => setLoading(false))
  }, [weekStart, tenantId])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  const prevWeek = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })
  const nextWeek = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })

  const midWeek = new Date(weekStart)
  midWeek.setDate(midWeek.getDate() + 3)
  const monthLabel = midWeek.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  const selectedDay = days.find(d => d.iso === selectedDate)

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Nom requis'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          startTime: `${selectedDate}T${selectedTime}`,
          tenantId,
          'cf-turnstile-response': turnstileToken,
        }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la réservation')
        turnstileRef.current?.reset()
      }
    } catch { setError('Impossible de contacter le serveur') }
    setSaving(false)
  }

  if (!isAvailable) {
    return (
      <section id="rdv" className="scroll-mt-24 border-y border-stone-200 bg-white px-4 py-[68px] md:py-[104px]">
        <div className="container mx-auto max-w-[1160px]">
          <div className="mx-auto mb-12 max-w-[620px] text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">{t('title')}</span>
            <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">{t('title')}</h2>
          </div>
          <p className="text-center text-stone-500">{t('unavailable')}</p>
          {practicePhone && (
            <p className="mt-2 text-center text-sm text-stone-600">
              {t('unavailableCall', { phone: practicePhone })}
              <a href={`tel:${practicePhone}`} className="ms-1 font-semibold text-primary-700 hover:underline">{practicePhone}</a>
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section id="rdv" className="scroll-mt-24 border-y border-stone-200 bg-white px-4 py-[68px] md:py-[104px]">
      <div className="container mx-auto max-w-[1160px]">
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">{t('title')}</span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">{t('title')}</h2>
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
              <button onClick={prevWeek} aria-label="Semaine précédente" className="flex size-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500">
                <ChevronLeft className="size-3.5" />
              </button>
              <strong className="font-heading text-[.98rem] text-stone-800 capitalize">{monthLabel}</strong>
              <button onClick={nextWeek} aria-label="Semaine suivante" className="flex size-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500">
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 px-[22px] py-[18px]">
              {FR_DAYS.map((d, i) => (
                <div key={i} className="text-center text-[.7rem] font-bold uppercase text-stone-500">{d}</div>
              ))}
              {loading ? (
                <div className="col-span-7 py-4 text-center text-sm text-stone-500">{t('loading')}</div>
              ) : days.length === 7 && days.map((day, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedDate(day.iso); setSelectedTime(null) }}
                  disabled={!day.available}
                  className={`aspect-square rounded-[10px] flex items-center justify-center text-[.82rem] font-semibold transition-colors ${
                    day.iso === selectedDate ? 'bg-primary-600 text-white' :
                    day.available ? 'border border-primary-200 bg-primary-50 text-primary-700 cursor-pointer hover:bg-primary-100' :
                    'bg-cream-200 text-stone-500 cursor-default'
                  }`}>
                  {new Date(day.iso).getDate()}
                </button>
              ))}
            </div>

            {selectedDay && selectedDay.times.length > 0 && (
              <div className="flex flex-wrap gap-2.5 px-[22px] py-1 pb-[22px]">
                {selectedDay.times.map((time) => (
                  <button key={time} onClick={() => setSelectedTime(time)}
                    className={`rounded-full border px-[14px] py-2 text-[.83rem] font-semibold transition-colors ${
                      time === selectedTime ? 'bg-primary-600 border-primary-600 text-white' :
                      'border-stone-200 bg-white text-stone-600 hover:border-primary-300'
                    }`}>
                    {time}
                  </button>
                ))}
              </div>
            )}
            {selectedDay && selectedDay.times.length === 0 && (
              <p className="px-[22px] pb-[18px] text-sm text-stone-500">Aucun créneau disponible ce jour.</p>
            )}

            {selectedDate && selectedTime && (
              <div className="border-t border-stone-200 px-[22px] py-[18px] space-y-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet *"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500" />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Turnstile ref={turnstileRef} onTokenChange={setTurnstileToken} />
                <button onClick={handleSubmit} disabled={saving || !turnstileToken}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cta-600 py-3.5 text-[.95rem] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-700">
                  {saving ? 'Réservation…' : `Confirmer le ${new Date(selectedDate).toLocaleDateString(locale, { day: 'numeric', month: 'long' })} à ${selectedTime}`}
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
