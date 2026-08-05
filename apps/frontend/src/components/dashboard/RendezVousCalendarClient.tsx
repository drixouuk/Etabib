'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Mail, Phone, Video } from 'lucide-react'
import BookingSheet, { type BookingDraft } from './BookingSheet'
import { RdvDetailView, type RdvDetail } from '@/components/agenda/RdvDetailView'
import type { CalBooking } from '@/lib/booking'

const TZ = 'Africa/Casablanca'
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEKDAY_HEADS = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.']
const DAY_NAMES_SHORT = ['DIM.', 'LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.']
const MAX_CHIPS_PER_DAY = 3

// Échelle de temps de la vue semaine
const DAY_START = 7
const DAY_END = 20
const DAY_HOURS = DAY_END - DAY_START
const MIN_BLOCK_PX = 24 // hauteur mini d'un RDV (lisibilité, ex. 5 min)

type View = 'mois' | 'semaine'

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

// Formatters Intl créés une seule fois (module scope) — pas d'instanciation par render
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dayLongFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const whenFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short' })

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n) }
function dayKeyOf(d: Date): string { return dayKeyFmt.format(d) }
function dayKeyOfISO(iso: string): string { return dayKeyOf(new Date(iso)) }
function fmtTime(iso: string): string { return timeFmt.format(new Date(iso)) }
function fmtDayLong(iso: string): string { return dayLongFmt.format(new Date(iso)) }
function fmtWhen(startISO: string, endISO: string): string {
  return `${whenFmt.format(new Date(startISO))} · ${fmtTime(startISO)} – ${fmtTime(endISO)}`
}
function minutesOf(iso: string): number {
  const [h, m] = clockFmt.format(new Date(iso)).split(':').map(Number)
  return h * 60 + m
}

// B4 — persistance par device : vue (mois|semaine) et début de semaine.
// Le choix manuel écrase le défaut et survit aux visites suivantes.
const VIEW_STORAGE_KEY = 'rdv-calendar-view'
const WEEK_START_STORAGE_KEY = 'rdv-week-start'

type WeekStart = 'monday' | 'sunday' | 'saturday'

function readStorage(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null
  } catch {
    return null // localStorage bloqué (privé)
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* silencieux */
  }
}

/** Début de semaine selon la préférence utilisateur (lundi par défaut). */
function weekStartOf(d: Date, start: WeekStart): Date {
  const day = d.getDay() // 0 = dimanche
  let diff: number
  if (start === 'monday') diff = (day + 6) % 7
  else if (start === 'sunday') diff = day
  else diff = (day + 1) % 7 // samedi : le samedi est le jour 1 de la semaine
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  date.setDate(date.getDate() - diff)
  return date
}

async function loadRange(start: Date, end: Date): Promise<CalBooking[]> {
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
  // B4 — vue persistée par device. Défaut serveur STABLE ('mois') : les
  // lectures localStorage/matchMedia sont des API client-only — les faire
  // dans l'initialiseur paresseux créerait un mismatch d'hydratation pour
  // tout visiteur ayant une préférence stockée (SSR ≠ premier rendu client).
  // La préférence réelle est lue APRÈS montage (voir effet ci-dessous).
  const [view, setView] = useState<View>('mois')
  const [weekStart, setWeekStart] = useState<WeekStart>('monday')
  const [mounted, setMounted] = useState(false)
  const changeView = (v: View) => {
    setView(v)
    writeStorage(VIEW_STORAGE_KEY, v)
  }
  const changeWeekStart = (w: WeekStart) => {
    setWeekStart(w)
    writeStorage(WEEK_START_STORAGE_KEY, w)
  }
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  useEffect(() => {
    // B4 — après hydratation : préférence stockée, sinon défaut par device
    // (tactile → semaine, pointeur précis → mois).
    const saved = readStorage(VIEW_STORAGE_KEY)
    if (saved === 'mois' || saved === 'semaine') setView(saved)
    else if (window.matchMedia('(pointer: coarse)').matches) setView('semaine')
    const ws = readStorage(WEEK_START_STORAGE_KEY)
    if (ws === 'sunday' || ws === 'saturday') setWeekStart(ws)
    setMounted(true)
  }, [])
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
    let start: Date
    let end: Date
    if (view === 'mois') {
      start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - 7)
      end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 8)
    } else {
      const ws = weekStartOf(cursor, weekStart)
      start = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() - 1)
      end = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 30)
    }
    loadRange(start, end).then((docs) => {
      if (!cancelled) setEvents(docs)
    })
    return () => { cancelled = true }
  }, [cursor, view])

  const refresh = useCallback(async () => {
    if (view === 'mois') {
      setEvents(await loadRange(new Date(cursor.getFullYear(), cursor.getMonth(), 1 - 7), new Date(cursor.getFullYear(), cursor.getMonth() + 1, 8)))
    } else {
      const ws = weekStartOf(cursor, weekStart)
      setEvents(await loadRange(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() - 1), new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 30)))
    }
    router.refresh()
  }, [cursor, view, router])

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

  const stepCursor = useCallback((delta: number) => {
    setCursor((c) => {
      if (view === 'mois') return new Date(c.getFullYear(), c.getMonth() + delta, 1)
      const d = new Date(c)
      d.setDate(d.getDate() + delta * 7)
      return d
    })
  }, [view])

  const goToday = useCallback(() => {
    setCursor(view === 'mois' ? new Date(today.getFullYear(), today.getMonth(), 1) : weekStartOf(today, weekStart))
  }, [view, today])

  // Grille du mois (lundi en tête), rangées flex qui remplissent la hauteur fixe
  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7
  const monthCells: { date: Date; out: boolean; key: string; appts: CalBooking[] }[] = []
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(y, m, 1 - offset + i, 12, 0)
    const key = dayKeyOf(date)
    monthCells.push({ date, out: date.getMonth() !== m, key, appts: eventsByDay.get(key) ?? [] })
  }
  const monthRows: typeof monthCells[] = []
  for (let i = 0; i < monthCells.length; i += 7) monthRows.push(monthCells.slice(i, i + 7))

  // Semaine courante
  const weekStartDate = weekStartOf(cursor, weekStart)
  const weekEnd = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6)
  const weekCells = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + i, 12, 0)
    const key = dayKeyOf(date)
    return { date, key, appts: eventsByDay.get(key) ?? [] }
  })

  const weekLabel =
    weekStartDate.getFullYear() === weekEnd.getFullYear()
      ? `${shortFmt.format(weekStartDate)} – ${shortFmt.format(weekEnd)} ${weekEnd.getFullYear()}`
      : `${shortFmt.format(weekStartDate)} ${weekStartDate.getFullYear()} – ${shortFmt.format(weekEnd)} ${weekEnd.getFullYear()}`

  const calendarLabel = view === 'mois' ? `${MONTHS_FR[m]} ${y}` : weekLabel
  const dateInputValue = view === 'mois'
    ? `${y}-${pad2(m + 1)}-01`
    : dayKeyOf(weekStartDate)

  const onDateInput = (value: string) => {
    const parts = value.split('-')
    if (parts.length !== 3) return
    const picked = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    setCursor(view === 'mois' ? new Date(picked.getFullYear(), picked.getMonth(), 1) : weekStartOf(picked, weekStart))
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

  const renderChips = (appts: CalBooking[], max: number) => (
    <>
      {appts.slice(0, max).map((b) => (
        <button
          key={b.id}
          onClick={(e) => {
            e.stopPropagation()
            openEdit(b)
          }}
          className="truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-start text-[10.5px] leading-[1.35] text-primary-700 transition-colors hover:bg-primary/15"
        >
          <b className="font-bold">{fmtTime(b.startTime)}</b> {b.attendeeName || 'Patient'}
        </button>
      ))}
      {appts.length > max && (
        <div className="px-1.5 text-[10px] text-muted-foreground">
          +{appts.length - max} autres
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-[27px] font-bold tracking-tight text-foreground">Rendez-vous</h1>
        <p className="text-[13.5px] text-muted-foreground capitalize">{fmtDayLong(today.toISOString())}</p>
      </div>

      {!mounted ? (
        // Placeholder stable SSR/client : la vue réelle n'est montée qu'après
        // hydratation (lecture de la préférence) — aucun flash de vue.
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Chargement du calendrier…
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:h-[calc(100vh-190px)] lg:grid-cols-3">
        {/* Calendrier — 2/3 */}
        <div className="lg:col-span-2 lg:flex lg:min-h-0 lg:flex-col">
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="rounded-[10px] border border-primary/20 bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-primary/10"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => stepCursor(-1)}
                aria-label="Précédent"
                className="flex size-[34px] items-center justify-center rounded-[10px] border border-primary/20 bg-card text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary-700"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="min-w-[130px] text-center text-base font-bold text-foreground capitalize">
                {calendarLabel}
              </div>
              <button
                onClick={() => stepCursor(1)}
                aria-label="Suivant"
                className="flex size-[34px] items-center justify-center rounded-[10px] border border-primary/20 bg-card text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary-700"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <select
                value={view}
                onChange={(e) => changeView(e.target.value as View)}
                className="cursor-pointer rounded-[9px] border border-primary/20 bg-card px-3 py-2 text-[12.5px] text-foreground"
                aria-label="Vue"
              >
                <option value="mois">Mois</option>
                <option value="semaine">Semaine</option>
              </select>
              <select
                value={weekStart}
                onChange={(e) => changeWeekStart(e.target.value as WeekStart)}
                className="hidden cursor-pointer rounded-[9px] border border-primary/20 bg-card px-3 py-2 text-[12.5px] text-foreground md:block"
                aria-label="Début de semaine"
              >
                <option value="monday">Lundi</option>
                <option value="sunday">Dimanche</option>
                <option value="saturday">Samedi</option>
              </select>
              <input
                type="date"
                value={dateInputValue}
                onChange={(e) => onDateInput(e.target.value)}
                aria-label="Date"
                className="cursor-pointer rounded-[9px] border border-primary/20 bg-card px-3 py-2 text-[12.5px] text-foreground"
              />
            </div>
          </div>

          <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {view === 'mois' ? (
              <>
            <div className="grid shrink-0 grid-cols-7">
              {WEEKDAY_HEADS.map((h) => (
                <div key={h} className="border-b border-border px-2.5 pb-2 pt-3 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                  {h}
                </div>
              ))}
            </div>
              <div className="flex min-h-0 flex-1 flex-col">
                {monthRows.map((row, ri) => (
                  <div key={ri} className="grid min-h-0 flex-1 grid-cols-7">
                    {row.map((cell) => (
                      <div
                        key={cell.key}
                        onClick={() => openCreate(cell.date)}
                        className={`flex min-h-[96px] cursor-pointer flex-col gap-1 border-r p-2 transition-colors hover:bg-muted lg:min-h-0 ${
                          ri < monthRows.length - 1 ? 'border-b' : ''
                        } ${cell.out ? 'bg-muted/60' : ''}`}
                      >
                        <div
                          className={`flex size-[22px] items-center justify-center rounded-full text-[12.5px] font-semibold ${
                            cell.key === todayKey
                              ? 'bg-primary-600 text-white'
                              : cell.out
                                ? 'text-muted-foreground'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {cell.date.getDate()}
                        </div>
                        {renderChips(cell.appts, MAX_CHIPS_PER_DAY)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              </>
            ) : (
              <>
            <div className="grid shrink-0 grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-border">
              <div />
              {weekCells.map((cell) => (
                <div key={cell.key} className="flex flex-col items-center gap-0.5 py-1.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">
                    {DAY_NAMES_SHORT[cell.date.getDay()]}
                  </span>
                  <span
                    className={`flex size-[22px] items-center justify-center rounded-full text-[12.5px] font-semibold ${
                      cell.key === todayKey ? 'bg-primary-600 text-white' : 'text-muted-foreground'
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid min-h-[380px] flex-1 grid-cols-[44px_repeat(7,minmax(0,1fr))]">
              <div className="relative border-r border-border">
                {Array.from({ length: DAY_HOURS + 1 }, (_, i) => DAY_START + i).map((h) => (
                  <span
                    key={h}
                    className="absolute end-1.5 text-[9.5px] font-medium text-muted-foreground"
                    style={{
                      top: `calc(${((h - DAY_START) / DAY_HOURS) * 100}% + 3px)`,
                      transform: h === DAY_END ? 'translateY(-100%)' : undefined,
                    }}
                  >
                    {h}h
                  </span>
                ))}
              </div>
              {weekCells.map((cell) => (
                <div
                  key={cell.key}
                  onClick={() => openCreate(cell.date)}
                  className={`relative min-h-0 cursor-pointer border-r border-border ${
                    cell.key === todayKey ? 'bg-muted' : ''
                  }`}
                >
                  {Array.from({ length: DAY_HOURS + 1 }, (_, i) => DAY_START + i).map((h) => (
                    <div
                      key={h}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/80"
                      style={{ top: `${((h - DAY_START) / DAY_HOURS) * 100}%` }}
                    />
                  ))}
                  {cell.appts.map((b) => {
                    const startMin = minutesOf(b.startTime)
                    const endMin = startMin + (b.duration || 30)
                    const scaleMin = DAY_HOURS * 60
                    const relStart = Math.min(Math.max((startMin - DAY_START * 60) / scaleMin, 0), 1)
                    const relEnd = Math.min(Math.max((endMin - DAY_START * 60) / scaleMin, 0), 1)
                    const topPct = relStart * 100
                    const heightPct = Math.max((relEnd - relStart) * 100, 0.001)
                    return (
                      <button
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(b)
                        }}
                        className="absolute inset-x-1 z-10 truncate rounded-md border-s-2 border-primary-600 bg-primary/10 px-1.5 text-start text-[10.5px] leading-snug text-primary-700 transition-colors hover:bg-primary/15"
                        style={{ top: `${topPct}%`, height: `max(${MIN_BLOCK_PX}px, ${heightPct}%)` }}
                      >
                        <b className="font-bold">{fmtTime(b.startTime)}</b> {b.attendeeName || 'Patient'}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
              </>
            )}
          </div>
          </div>
        </div>

        {/* Liste — 1/3 */}
        <div className="lg:flex lg:min-h-0 lg:flex-col">
          <div className="mb-4 inline-flex shrink-0 rounded-[10px] bg-primary/10 p-0.5">
            <button
              onClick={() => setListMode('avenir')}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${
                listMode === 'avenir' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              À venir ({upcoming.length})
            </button>
            <button
              onClick={() => setListMode('passes')}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${
                listMode === 'passes' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Passés ({past.length})
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-sm lg:pe-0.5">
            {activeList.length === 0 && (
              <div className="px-9 py-9 text-center text-[13px] text-muted-foreground">
                Aucun rendez-vous {listMode === 'avenir' ? 'à venir' : 'passé'} sur cette période.
              </div>
            )}
            {activeList.map((b) => {
              const end = new Date(new Date(b.startTime).getTime() + (b.duration || 30) * 60000).toISOString()
              return (
                <div
                  key={b.id}
                  onClick={() => openEdit(b)}
                  className="flex cursor-pointer items-start gap-3.5 border-t border-border px-5 py-3.5 transition-colors first:border-t-0 hover:bg-muted/60"
                >
                  <div className="w-[104px] shrink-0">
                    <div className="text-[13px] font-bold text-primary-700">
                      {fmtTime(b.startTime)} — {fmtTime(end)}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">({b.duration || 30} min)</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-foreground">{b.attendeeName || 'Patient'}</div>
                    {b.title && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{b.title}</div>}
                    {(b.attendeeEmail || b.attendeePhone) && (
                      <div className="mt-1.5 flex flex-wrap gap-3.5 text-[11.5px] text-muted-foreground">
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
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary-700 transition-colors hover:bg-primary/15"
                      >
                        <Video className="size-3.5" />Rejoindre la visio
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[b.status] || 'bg-accent text-muted-foreground'}`}>
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
        </div>
      </div>
      )}

      {/* B1 — « look first, edit second » : le tap ouvre la vue lecture ;
          « Modifier » y monte le formulaire. La création reste en formulaire. */}
      {editingDraft && (
        <RdvDetailView
          tenantId={tenantId}
          booking={editingDraft as RdvDetail}
          whenLabel={sheetWhen}
          onClose={() => { setEditing(null); setCreating(null) }}
          onSaved={refresh}
          onToast={showToast}
        />
      )}
      <BookingSheet
        tenantId={tenantId}
        booking={null}
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
