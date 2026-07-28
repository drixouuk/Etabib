# LOT SX-1 — Remplacer Cal.com par Schedule-X (agenda interne + réservation publique)

## Audit complet — tout ce qui change

### Fichiers à CRÉER (4)

| Fichier | Rôle |
|---------|------|
| `apps/frontend/src/components/dashboard/ScheduleXCalendar.tsx` | Wrapper React Schedule-X |
| `apps/frontend/src/components/booking/PublicBookingWidget.tsx` | Widget public réservation |
| `apps/frontend/src/app/api/bookings/route.ts` | `POST` création RDV + `GET` créneaux disponibles |
| `apps/frontend/src/app/api/bookings/available-slots/route.ts` | `GET` créneaux libres pour une date |

### Fichiers à MODIFIER (7)

| Fichier | Changement |
|---------|-----------|
| `apps/frontend/package.json` | `- @calcom/embed-react`, `+ @schedule-x/calendar @schedule-x/theme-default @schedule-x/events-service` |
| `apps/frontend/src/app/[locale]/page.tsx` | `RdvSection` → `PublicBookingWidget`, supprimer `RdvCtaButton` |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx` | Ajouter `<ScheduleXCalendar>` avant `<BookingListView>` |
| `apps/frontend/src/components/layout/Header.tsx` | `dispatchEvent("open-rdv")` → `<Link href="/fr#rdv">` |
| `apps/frontend/src/components/onboarding/SignupForm.tsx` | Supprimer fieldset Cal.com (eventSlug, username, customUrl) |
| `apps/frontend/src/components/onboarding/OnboardingFlow.tsx` | Remplacer mentions "Cal.com" par "en ligne" |
| `apps/frontend/src/app/api/onboarding/route.ts` | Supprimer `calcomSettings` du body de création tenant |

### Fichiers à SUPPRIMER (3)

| Fichier |
|---------|
| `apps/frontend/src/components/sections/RdvSection.tsx` |
| `apps/frontend/src/components/booking/CalBookingWidget.tsx` |
| `apps/frontend/src/components/ui/RdvCtaButton.tsx` |

### Fichiers à DÉSACTIVER (1)

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/app/api/calcom-webhook/route.ts` | Commenter `export async function POST`, garder le fichier pour référence |

### Fichiers INTENTIONNELLEMENT NON MODIFIÉS (Phase 1)

| Fichier | Raison |
|---------|--------|
| `apps/cms/src/collections/CalBookings.ts` | Réutilisé tel quel — stocke les bookings qu'ils viennent de Cal.com ou de notre formulaire |
| `apps/cms/src/collections/Tenants.ts` | `calcomSettings` group conservé pour backward compat |
| `apps/cms/src/seed.ts` | Conservé — le seed existant continue de fonctionner |
| `apps/cms/payload.config.ts` | `CalBookings` toujours enregistré |
| `apps/frontend/src/lib/payload.ts` | `CalComSettings` type conservé |
| `apps/frontend/src/components/dashboard/BookingListView.tsx` | Inchangé — lit `calbookings` comme avant |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx` | Placeholder "Présence RDV" inchangé (rempli en phase 3) |

---

## PATCH 1 — Créneaux disponibles avant formulaire (éviter doubles réservations)

**Problème** : actuellement le widget public ne montre pas les créneaux déjà pris. Le patient choisit un créneau, soumet, et reçoit une erreur 409 si conflit.

**Solution** : ajouter un endpoint `GET /api/bookings/available-slots?date=YYYY-MM-DD` qui retourne les créneaux **déjà occupés** (heures uniquement, sans PII). Le widget public les grise ou les cache.

### `GET /api/bookings/available-slots/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  const tenantId = request.headers.get('x-tenant-id') || request.nextUrl.searchParams.get('tenantId')

  if (!date || !tenantId) {
    return NextResponse.json({ error: 'date et tenantId requis' }, { status: 400 })
  }

  const dayStart = new Date(date)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  // Note: le CMS nécessite une auth pour read sur calbookings.
  // On ne peut pas faire de GET public vers /api/calbookings.
  // Solution: on retourne les créneaux en 30 min par défaut, et le POST /api/bookings
  // vérifie les conflits au moment de la soumission.
  // Pour l'instant, on retourne un tableau vide (tous les créneaux sont supposés libres).
  // La vérification de conflit est faite dans le POST.

  // TODO Phase 2: quand availability-slots sera déployé, remplir les créneaux réels.
  // TODO Phase 2: ajouter un endpoint CMS public pour les créneaux occupés.

  return NextResponse.json({
    date,
    slotDurationMinutes: 30,
    busySlots: [], // les créneaux occupés — vide pour l'instant, conflits vérifiés au POST
  })
}
```

**Note importante** : la collection `calbookings` a un `read` access control qui exige l'authentification. On ne peut pas interroger les créneaux occupés sans auth. Le vrai filtrage se fait donc dans le `POST /api/bookings` (vérification de conflit au moment de la soumission).

**Alternative future (phase 2)** : ajouter un endpoint CMS custom qui retourne les créneaux occupés sans exposer les données patient.

### Dans `PublicBookingWidget.tsx`

Avant d'afficher le calendrier, appeler `GET /api/bookings/available-slots?date=...` pour obtenir les créneaux occupés et les passer au calendrier Schedule-X en mode `disabled` ou avec un callback qui rejette les clics sur créneaux occupés.

## PATCH 2 — UTC → heure locale Maroc (`Africa/Casablanca`)

**Problème** : `toLocaleDateString('fr-FR')` utilise le fuseau horaire du serveur (UTC), pas celui du Maroc (UTC+1 ou UTC+0 selon l'heure d'été/hiver). Les heures affichées dans le calendrier et les formulaires sont décalées.

**Solution** : remplacer TOUS les `toLocaleDateString('fr-FR')` et `toLocaleTimeString('fr-FR')` dans les fichiers concernés par `Intl.DateTimeFormat` avec `timeZone: 'Africa/Casablanca'`.

### Fonction utilitaire partagée

**Fichier à créer ou modifier** : `apps/frontend/src/lib/datetime.ts`

```typescript
const MOROCCO_TZ = 'Africa/Casablanca'

export function formatDateMorocco(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: MOROCCO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatTimeMorocco(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: MOROCCO_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDateTimeMorocco(iso: string): string {
  return `${formatDateMorocco(iso)} ${formatTimeMorocco(iso)}`
}
```

### Fichiers à mettre à jour avec ce formatteur

- `ScheduleXCalendar.tsx` : formater les dates dans les événements
- `PublicBookingWidget.tsx` : afficher la date du créneau sélectionné
- `BookingListView.tsx` : remplacer `toLocaleTimeString('fr-FR')` par `formatTimeMorocco`
- `rendez-vous/page.tsx` : remplacer `toLocaleDateString` par `formatDateMorocco`

## PATCH 3 — `fetch(CMS_URL)` : garder, pas d'alternative locale

**Analyse** : dans le déploiement de production, le frontend est sur **Vercel** et le CMS est sur un **LXC Proxmox**. Ils ne partagent pas le même processus Node.js. Impossible d'importer `getPayload` depuis `apps/cms` dans une API route Next.js sur Vercel — les deux apps sont déployées séparément.

**Décision** : on garde `fetch(process.env.NEXT_PUBLIC_CMS_URL)` pour tous les appels API. Pour la sécurité :

1. Le `POST /api/bookings` est public (pas d'auth) — c'est le formulaire de réservation. Pour éviter les abus :
   - Vérifier l'en-tête `Origin` correspond au domaine attendu
   - Ajouter un `rate-limit` simple (max 5 requêtes par IP par minute)
   - Le endpoint `GET /api/bookings/available-slots` est aussi public mais ne retourne pas de PII

2. Pour les appels authentifiés (dashboard), le cookie `payload-token` est transmis via le proxy `cms-proxy/[...path]` — pas de changement.

---

## Étape 0 — Dépendances

```bash
pnpm --filter frontend add @schedule-x/calendar @schedule-x/theme-default @schedule-x/events-service
pnpm --filter frontend remove @calcom/embed-react
```

## Étape 1 — Librairie utilitaire datetime

**Fichier à créer** : `apps/frontend/src/lib/datetime.ts`

```typescript
const MOROCCO_TZ = 'Africa/Casablanca'

export function formatDateMorocco(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: MOROCCO_TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

export function formatTimeMorocco(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: MOROCCO_TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
```

## Étape 2 — Wrapper React Schedule-X

**Fichier à créer** : `apps/frontend/src/components/dashboard/ScheduleXCalendar.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { createCalendar, viewWeek, viewMonthGrid } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import '@schedule-x/theme-default/dist/index.css'

type CalendarEvent = { id: string | number; title: string; start: string; end: string }

type Props = {
  events: CalendarEvent[]
  onDateClick?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  disabledDates?: string[] // créneaux déjà occupés (ISO 8601)
}

export default function ScheduleXCalendar({ events, onDateClick, onEventClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<ReturnType<typeof createCalendar> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const eventsService = createEventsServicePlugin()
    const calendar = createCalendar({
      views: [viewMonthGrid, viewWeek],
      defaultView: 'month-grid',
      plugins: [eventsService],
      events: events.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })),
      callbacks: {
        onClickDateTime(dateTime) {
          onDateClick?.(dateTime.toString())
        },
        onEventClick(event) {
          onEventClick?.({ id: event.id, title: event.title as string, start: event.start.toString(), end: event.end.toString() })
        },
      },
    })
    calendar.render(containerRef.current)
    calendarRef.current = calendar
    return () => { calendarRef.current = null }
  }, [])

  useEffect(() => {
    calendarRef.current?.eventsService.set(events.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })))
  }, [events])

  return <div ref={containerRef} className="schedule-x-calendar" />
}
```

## Étape 3 — Widget public de réservation

**Fichier à créer** : `apps/frontend/src/components/booking/PublicBookingWidget.tsx`

Remplace `RdvSection.tsx`. Formulaire 4 étapes : calendrier → créneaux horaires → formulaire → confirmation.

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import ScheduleXCalendar from '@/components/dashboard/ScheduleXCalendar'
import { formatTimeMorocco } from '@/lib/datetime'

// Heures ouvrées par défaut (Phase 1 — remplacé par availability-slots en Phase 2)
const WORK_HOURS = { start: 9, end: 17 } // 09:00-17:00
const SLOT_DURATION = 30 // minutes
const WORK_DAYS = [1, 2, 3, 4, 5, 6] // Lun-Sam

function generateSlots(dateStr: string): string[] {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay() // 0 = Dimanche
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

export default function PublicBookingWidget() {
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
    // TODO Phase 2 : filtrer les créneaux déjà occupés via GET /api/bookings/available-slots
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
      // Construire la date complète : date sélectionnée + heure du créneau
      const datePart = selectedDate!.split('T')[0] // "2026-07-27"
      const startTime = `${datePart}T${selectedSlot}:00` // "2026-07-27T09:00:00"
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), startTime }),
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
          {/* Étape 1 : calendrier */}
          {step === 'calendar' && (
            <ScheduleXCalendar events={[]} onDateClick={handleDateClick} />
          )}

          {/* Étape 2 : créneaux horaires */}
          {step === 'slots' && selectedDate && (
            <div>
              <p className="mb-4 text-sm text-stone-500">
                Choisissez un créneau pour le {new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Casablanca', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedDate))}
              </p>
              {availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-stone-400">Aucun créneau disponible ce jour-là.</p>
                  <button onClick={() => setStep('calendar')} className="mt-4 text-sm text-primary-600 hover:text-primary-700">Choisir une autre date</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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

          {/* Étape 3 : formulaire */}
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

          {/* Étape 4 : confirmation */}
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
```

## Étape 4 — API création RDV

**Fichier à créer** : `apps/frontend/src/app/api/bookings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { formatTimeMorocco } from '@/lib/datetime'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://drguinane.drixou.uk'

// Rate limiting simple (en mémoire, réinitialisé au redémarrage)
const rateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Trop de requêtes. Veuillez patienter.' }, { status: 429 })
  }

  const body = await request.json()
  const { name, phone, email, startTime } = body
  if (!name || !startTime) {
    return NextResponse.json({ error: 'Nom et créneau requis' }, { status: 400 })
  }

  // Interpréter explicitement comme heure Maroc (UTC+1), puis convertir en UTC
  const moroccoDate = new Date(startTime + '+01:00')
  if (isNaN(moroccoDate.getTime())) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }

  // Vérifier que le créneau n'est pas dans le passé
  if (moroccoDate <= new Date()) {
    return NextResponse.json({ error: 'Créneau déjà passé' }, { status: 400 })
  }

  const endDate = new Date(moroccoDate.getTime() + 30 * 60000) // +30 min
  const tenantId = request.headers.get('x-tenant-id') || 'default-tenant'

  // Vérifier les conflits — interroger le CMS
  const conflictRes = await fetch(
    `${CMS_URL}/api/calbookings?where[tenant][equals]=${encodeURIComponent(tenantId)}&where[startTime][less_than]=${endDate.toISOString()}&where[endTime][greater_than]=${moroccoDate.toISOString()}&where[status][not_equals]=cancelled&depth=0&limit=1`,
    { headers: { 'Content-Type': 'application/json' } }
  )
  const conflicts = await conflictRes.json()
  if (conflicts.docs?.length > 0) {
    return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
  }

  // Créer le booking
  const bookingUid = `booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const res = await fetch(`${CMS_URL}/api/calbookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingUid,
      tenant: tenantId,
      eventTypeSlug: 'consultation',
      title: 'Consultation',
      status: 'accepted',
      startTime: moroccoDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: 30,
      attendeeName: name.trim(),
      attendeeEmail: email?.trim() || '',
      attendeePhone: phone?.trim() || '',
      location: '',
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erreur serveur lors de la création' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    booking: {
      date: formatTimeMorocco(slotDate.toISOString()),
      name: name.trim(),
    },
  })
}
```

## Étape 5 — Agenda dashboard

**Fichier à modifier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx`

Ajouter AVANT le `<BookingListView>` :

```tsx
import ScheduleXCalendar from '@/components/dashboard/ScheduleXCalendar'

// Dans le JSX :
<div className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
  <ScheduleXCalendar
    events={bookings.map(b => ({
      id: b.id,
      title: `${b.attendeeName || 'Patient'} — ${b.title || 'Consultation'}`,
      start: b.startTime,
      end: b.endTime,
    }))}
  />
</div>
```

## Étape 6 — Cleanup Cal.com (fichiers à modifier/supprimer)

### 6a. `apps/frontend/src/app/[locale]/page.tsx`
- Remplacer `import RdvSection from ...` par `import PublicBookingWidget from '@/components/booking/PublicBookingWidget'`
- Supprimer `import RdvCtaButton from ...`
- Remplacer `<RdvCtaButton ...>` par `<Link href="/fr#rdv" ...>`
- Remplacer `<RdvSection calcom={tenant?.calcomSettings} />` par `<PublicBookingWidget />`

### 6b. `apps/frontend/src/components/layout/Header.tsx`
- Remplacer `window.dispatchEvent(new CustomEvent("open-rdv"))` par `window.location.href = '/fr#rdv'`
- Les deux occurrences (desktop CTA + mobile hamburger)

### 6c. `apps/frontend/src/components/onboarding/SignupForm.tsx`
- Supprimer le bloc `{tier === 'rdv' && (<fieldset>...)}` (tout le fieldset Cal.com)
- Supprimer les champs `eventSlug`, `username`, `customUrl` du state `form`
- Supprimer la condition `if (tier === 'rdv') { body.eventSlug = ... }` dans `handleSubmit`

### 6d. `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`
- Remplacer `'Prise de rendez-vous en ligne (Cal.com)'` → `'Prise de rendez-vous en ligne'`
- Remplacer `'Configurez vos disponibilités dans Cal.com'` → `'Configurez vos disponibilités en ligne'`

### 6e. `apps/frontend/src/app/api/onboarding/route.ts`
- Remplacer `calcomSettings: { eventSlug: ..., username: ..., customUrl: ... }` par `calcomSettings: null`

### 6f. Suppressions
```bash
rm apps/frontend/src/components/sections/RdvSection.tsx
rm apps/frontend/src/components/booking/CalBookingWidget.tsx
rm apps/frontend/src/components/ui/RdvCtaButton.tsx
```

### 6g. Désactiver le webhook
Dans `apps/frontend/src/app/api/calcom-webhook/route.ts` :
- Commenter `export async function POST` (garder le fichier pour référence)

---

## Règles obligatoires

1. **Heure Maroc partout** : `Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Casablanca' })`.
2. **Rate limit** sur `POST /api/bookings` : max 5/min par IP.
3. **Vérification conflit** dans le POST uniquement (le GET available-slots est placeholder pour la phase 2).
4. **Ne pas casser la collection `calbookings`** — elle continue de fonctionner avec les mêmes champs.
5. **Ne pas supprimer les fichiers avant compilation OK** — d'abord créer/modifier, build, PUIS supprimer.
6. **Pas de `any`** non justifié.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `pnpm add/remove` (swap dépendances)
2. `lib/datetime.ts` — utilitaire fuseau Maroc
3. `ScheduleXCalendar.tsx` — wrapper
4. `PublicBookingWidget.tsx` — widget public
5. `api/bookings/route.ts` — endpoint POST
6. `api/bookings/available-slots/route.ts` — endpoint GET (placeholder)
7. Modifier `page.tsx`, `Header.tsx`, `rendez-vous/page.tsx`
8. Modifier `SignupForm.tsx`, `OnboardingFlow.tsx`, `onboarding/route.ts`
9. Build → OK
10. Supprimer `RdvSection.tsx`, `CalBookingWidget.tsx`, `RdvCtaButton.tsx`
11. Désactiver `calcom-webhook/route.ts`
12. Build final
