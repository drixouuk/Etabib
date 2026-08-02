'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Mail, Phone, Video } from 'lucide-react'
import BookingSheet, { type BookingDraft } from './BookingSheet'
import type { CalBooking } from '@/lib/booking'

const TZ = 'Africa/Casablanca'
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEKDAY_HEADS = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.']
const MAX_CHIPS_PER_DAY = 3

// Formatters Intl créés une seule fois (module scope) — pas d'instanciation par render
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const dayLongFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const whenFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })

type Props = {
  initialBookings: CalBooking[]
  tenantId: string
}

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Confirmé', pending: 'En attente', cancelled: 'Annulé', rejected: 'Refusé',
}
const STATUS_CLASSES: Record<string, string> = {
  accepted: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  cancelled: 'bg-error/10 text-error',
  rejected: 'bg-error/10 text-error',
}

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n) }

function dayKeyOf(d: Date): string {
  return dayKeyFmt.format(d)
}
function dayKeyOfISO(iso: string): string {
  return dayKeyOf(new Date(iso))
}
function fmtTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}
function fmtDayLong(iso: string): string {
  return dayLongFmt.format(new Date(iso))
}
function fmtWhen(startISO: string, endISO: string): string {
  return `${whenFmt.format(new Date(startISO))} · ${fmtTime(startISO)} – ${fmtTime(endISO)}`
}

async function loadMonth(y: number, m: number): Promise<CalBooking[]> {
  const start = new Date(y, m, 1 - 7)
  const end = new Date(y, m + 1, 8)
  try {
    const res = await fetch(
      `/api/cms-proxy/calbookings?where[startTime][greater_than_equal]=${encodeURIComponent(start.toISOString())}&where[startTime][less_than]=${encodeURIComponent(end.toISOString())}&sort=startTime&depth=0&limit=200`
    )
    const data = await res.json()
    return (data.docs ?? []) as CalBooking[]
  } catch {
    return []
  }
}

export default function RendezVousCalendarClient({ initialBookings, tenantId }: Props) {
  const rawLocale = useLocale()
  const isRTL = rawLocale === 'ar'
  const router = useRouter()

  const today = useMemo(() => new Date(), [])
  const [events, setEvents] = useState<CalBooking[]>(initialBookings)
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [listMode, setListMode] = useState<'avenir' | 'passes'>('avenir')
  const [editing, setEditing] = useState<CalBooking | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const todayKey = dayKeyFmt.format(today)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2300)
  }, [])

  useEffect(() => {
    let cancelled = false
    loadMonth(cursor.getFullYear(), cursor.getMonth()).then((docs) => {
      if (!cancelled) setEvents(docs)
    })
    return () => { cancelled = true }
  }, [cursor])

  const refresh = useCallback(async () => {
    setEvents(await loadMonth(cursor.getFullYear(), cursor.getMonth()))
    router.refresh()
  }, [cursor, router])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalBooking[]>()
    for (const b of events) {
      const k = dayKeyOfISO(b.startTime)
      const arr = map.get(k) ?? []
      arr.push(b)
      map.set(k, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    return map
  }, [events])

  const sortedEvents = useMemo(
    () => events.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events],
  )
  // À venir = date >= aujourd'hui (heure du cabinet), comme la maquette
  const upcoming = useMemo(
    () => sortedEvents.filter((b) => dayKeyOfISO(b.startTime) >= todayKey),
    [sortedEvents, todayKey],
  )
  const past = useMemo(
    () => sortedEvents.filter((b) => dayKeyOfISO(b.startTime) < todayKey).reverse(),
    [sortedEvents, todayKey],
  )
  const activeList = listMode === 'avenir' ? upcoming : past

  // Grille du mois (lundi en tête)
  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7
  const cells: { date: Date; out: boolean; key: string; appts: CalBooking[] }[] = []
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(y, m, 1 - offset + i, 12, 0)
    const key = dayKeyOf(date)
    cells.push({ date, out: date.getMonth() !== m, key, appts: eventsByDay.get(key) ?? [] })
  }

  const changeMonth = (delta: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  const openEdit = (b: CalBooking) => {
    setCreating(null)
    setEditing(b)
  }

  const openCreate = (date: Date) => {
    setEditing(null)
    setCreating(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0).toISOString())
  }

  const cancelBooking = async (b: CalBooking) => {
    try {
      const res = await fetch(`/api/cms-proxy/calbookings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Annulé par le cabinet' }),
      })
      if (res.ok) {
        await refresh()
        showToast('Rendez-vous annulé')
      }
    } catch {
      // silence
    }
  }

  const editingDraft: BookingDraft | null = useMemo(
    () =>
      editing
        ? {
            id: editing.id,
            status: editing.status,
            startTime: editing.startTime,
            endTime: editing.endTime,
            duration: editing.duration,
            attendeeName: editing.attendeeName,
            attendeeEmail: editing.attendeeEmail,
            attendeePhone: editing.attendeePhone,
            title: editing.title,
            location: editing.location,
          }
        : null,
    [editing],
  )

  const sheetWhen = useMemo(
    () => (editingDraft ? fmtWhen(editingDraft.startTime, editingDraft.endTime) : null),
    [editingDraft],
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-[27px] font-bold tracking-tight text-stone-800">Rendez-vous</h1>
        <p className="text-[13.5px] text-stone-600 capitalize">{fmtDayLong(today.toISOString())}</p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="rounded-[10px] border border-primary-600/20 bg-white px-3.5 py-2 text-[13px] font-medium text-stone-800 transition-colors hover:bg-primary-50"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Mois précédent"
            className="flex size-[34px] items-center justify-center rounded-[10px] border border-primary-600/20 bg-white text-stone-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-[112px] text-center text-base font-bold text-stone-800 capitalize">
            {MONTHS_FR[m]} {y}
          </div>
          <button
            onClick={() => changeMonth(1)}
            aria-label="Mois suivant"
            className="flex size-[34px] items-center justify-center rounded-[10px] border border-primary-600/20 bg-white text-stone-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <select
            defaultValue="Mois"
            className="cursor-pointer rounded-[9px] border border-primary-600/20 bg-white px-3 py-2 text-[12.5px] text-stone-800"
            aria-label="Vue"
          >
            <option value="Mois">Mois</option>
            <option value="Semaine" disabled>Semaine</option>
            <option value="Jour" disabled>Jour</option>
          </select>
          <input
            type="date"
            value={`${y}-${pad2(m + 1)}-${pad2(cursor.getDate())}`}
            onChange={(e) => {
              const parts = e.target.value.split('-')
              if (parts.length === 3) setCursor(new Date(Number(parts[0]), Number(parts[1]) - 1, 1))
            }}
            aria-label="Date"
            className="cursor-pointer rounded-[9px] border border-primary-600/20 bg-white px-3 py-2 text-[12.5px] text-stone-800"
          />
        </div>
      </div>

      {/* Calendrier */}
      <div dir={isRTL ? 'rtl' : 'ltr'} className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="grid grid-cols-7">
          {WEEKDAY_HEADS.map((h) => (
            <div key={h} className="border-b border-stone-100 px-2.5 pb-2 pt-3 text-[10.5px] font-bold uppercase tracking-wide text-stone-500">
              {h}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => (
            <div
              key={cell.key}
              onClick={() => openCreate(cell.date)}
              className={`flex min-h-[96px] cursor-pointer flex-col gap-1 border-b border-r border-stone-100 p-2 transition-colors hover:bg-cream-50 ${
                cell.out ? 'bg-stone-50/60' : ''
              }`}
            >
              <div
                className={`flex size-[22px] items-center justify-center rounded-full text-[12.5px] font-semibold ${
                  cell.key === todayKey
                    ? 'bg-primary-600 text-white'
                    : cell.out
                      ? 'text-stone-400'
                      : 'text-stone-600'
                }`}
              >
                {cell.date.getDate()}
              </div>
              {cell.appts.slice(0, MAX_CHIPS_PER_DAY).map((b) => (
                <button
                  key={b.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(b)
                  }}
                  className="truncate rounded-md bg-primary-50 px-1.5 py-0.5 text-left text-[10.5px] leading-[1.35] text-primary-700 transition-colors hover:bg-primary-100"
                >
                  <b className="font-bold">{fmtTime(b.startTime)}</b> {b.attendeeName || 'Patient'}
                </button>
              ))}
              {cell.appts.length > MAX_CHIPS_PER_DAY && (
                <div className="px-1.5 text-[10px] text-stone-500">
                  +{cell.appts.length - MAX_CHIPS_PER_DAY} autres
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="mb-4 inline-flex rounded-[10px] bg-primary-50 p-0.5">
        <button
          onClick={() => setListMode('avenir')}
          className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${
            listMode === 'avenir' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
          }`}
        >
          À venir ({upcoming.length})
        </button>
        <button
          onClick={() => setListMode('passes')}
          className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${
            listMode === 'passes' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-600 hover:text-stone-800'
          }`}
        >
          Passés ({past.length})
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {activeList.length === 0 && (
          <div className="px-9 py-9 text-center text-[13px] text-stone-500">
            Aucun rendez-vous {listMode === 'avenir' ? 'à venir' : 'passé'} sur ce mois.
          </div>
        )}
        {activeList.map((b) => {
          const end = new Date(new Date(b.startTime).getTime() + (b.duration || 30) * 60000).toISOString()
          return (
            <div
              key={b.id}
              onClick={() => openEdit(b)}
              className="flex cursor-pointer items-start gap-3.5 border-t border-stone-100 px-5 py-3.5 transition-colors first:border-t-0 hover:bg-stone-50/60"
            >
              <div className="w-[112px] shrink-0">
                <div className="text-[13px] font-bold text-primary-700">
                  {fmtTime(b.startTime)} — {fmtTime(end)}
                </div>
                <div className="text-[11.5px] text-stone-500">({b.duration || 30} min)</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-stone-800">{b.attendeeName || 'Patient'}</div>
                {b.title && <div className="mt-0.5 text-[12.5px] text-stone-600">{b.title}</div>}
                {(b.attendeeEmail || b.attendeePhone) && (
                  <div className="mt-1.5 flex flex-wrap gap-3.5 text-[11.5px] text-stone-500">
                    {b.attendeeEmail && (
                      <span className="inline-flex items-center gap-1.5"><Mail className="size-3" />{b.attendeeEmail}</span>
                    )}
                    {b.attendeePhone && (
                      <span className="inline-flex items-center gap-1.5"><Phone className="size-3" />{b.attendeePhone}</span>
                    )}
                  </div>
                )}
                {b.location?.startsWith('http') && (
                  <a
                    href={b.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-700 transition-colors hover:bg-primary-100"
                  >
                    <Video className="size-3.5" />Rejoindre la visio
                  </a>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[b.status] || 'bg-stone-100 text-stone-600'}`}>
                  {STATUS_LABELS[b.status] || b.status}
                </span>
                {b.status !== 'cancelled' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      cancelBooking(b)
                    }}
                    className="text-[12px] font-semibold text-error transition-colors hover:underline"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <BookingSheet
        tenantId={tenantId}
        booking={editingDraft}
        initialStart={creating}
        whenLabel={sheetWhen}
        onClose={() => { setEditing(null); setCreating(null) }}
        onSaved={refresh}
        onToast={showToast}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-primary-700 px-5 py-3 text-[13px] font-semibold text-white shadow-lg">
          <Check className="size-4" />
          {toast}
        </div>
      )}
    </>
  )
}
