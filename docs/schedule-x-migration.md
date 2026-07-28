# dr-tabibi — Remplacement Cal.com par Schedule-X (PRD + Plan 3 phases)

## Contexte

Cal.com auto-hébergé est intégré via iframe embed (`@calcom/embed-react`) + webhooks pour la sync. L'objectif est de supprimer cette dépendance externe et de gérer l'agenda et les rendez-vous en interne avec `@schedule-x/react`.

**Motivations :**
- Supprimer une LXC (Proxmox) et une DB PostgreSQL (`calcom-db`) de l'infra
- Éliminer la double authentification cross-domaine (iframe Cal.com)
- UI 100% cohérente avec notre design system
- Multi-tenant natif (pas de configuration Cal.com par tenant)
- Simplifier l'onboarding (plus de paramètres Cal.com à collecter)

**Risques :**
- Perte de la visio intégrée (Zoom/Meet) — à remplacer par un champ lien
- Perte des workflows Cal.com (rappels SMS) — à reconstruire en phase 3
- Perte de la sync Google/Outlook calendar — non demandé à ce stade
- Le plugin `createInteractiveEventModal` de Schedule-X est premium (`@sx-premium/`) — utiliser `onClickDateTime` + notre propre Sheet shadcn à la place en phase 1

---

## Plan 3 phases

| Phase | Contenu | Effort | Bloque |
|-------|---------|--------|--------|
| **Phase 1** | Agenda interne dashboard + réservation publique simple | ~1-2 semaines | Rien |
| **Phase 2** | Gestion complète des disponibilités (plages, récurrence, buffers) | ~2 semaines | Phase 1 |
| **Phase 3** | Notifications, annulation/report patient, champs customs | ~3-4 semaines | Phase 2 |

---

## PHASE 1 — Agenda interne + réservation publique

### Objectif

Remplacer la vue iframe Cal.com par un calendrier Schedule-X dans le dashboard, et reconstruire le widget de réservation côté public avec notre propre UI.

### Ce qui change

| Avant | Après |
|-------|-------|
| `RdvSection.tsx` → iframe Cal.com | `RdvSection.tsx` → formulaire de réservation custom + calendrier Schedule-X public |
| `@calcom/embed-react` | Supprimé du `package.json` |
| `POST /api/calcom-webhook` (webhook Cal.com → CMS) | `POST /api/bookings` (création directe depuis notre formulaire) |
| `Tenants.calcomSettings` (eventSlug, username, customUrl) | Remplacé par `Tenants.bookingSettings` (durée consultation, délai min, buffer) |
| Dashboard `/rendez-vous` : lit `calbookings` depuis CMS | Inchangé — la collection `calbookings` est réutilisée telle quelle |
| `BookingListView.tsx` | Inchangé |
| `ActivityView` "Présence aux rendez-vous" | Reste placeholder (phase 3) |

### Ce qui ne change pas

- Collection CMS `calbookings` — réutilisée, juste renommée en `bookings` (ou gardée `calbookings` pour éviter une migration lourde)
- `BookingListView.tsx` — inchangé
- Page `/dashboard/rendez-vous` — inchangée

### Nouveaux composants

1. **`ScheduleXCalendar.tsx`** — wrapper React pour Schedule-X (librairie vanilla, nécessite un wrapper)
2. **`PublicBookingWidget.tsx`** — remplace `RdvSection.tsx` et `CalBookingWidget.tsx`
3. **`POST /api/bookings/route.ts`** — endpoint de création de RDV (remplace le webhook)

### Dépendance à installer

```bash
pnpm add @schedule-x/calendar @schedule-x/theme-default @schedule-x/events-service
pnpm remove @calcom/embed-react
```

### Prompt Phase 1

---

## PHASE 2 — Gestion des disponibilités

### Objectif

Permettre au médecin de définir ses plages de disponibilité (horaires, jours, durée des consultations) via une UI dans `/dashboard/settings/availability`.

### Nouveaux composants

1. **Collection CMS `availability-slots`** — plages de disponibilité par tenant/docteur
2. **`AvailabilityManager.tsx`** — UI dans Settings pour gérer les plages (ajout, suppression, récurrence hebdo)
3. **Logique de conflit** — vérifier qu'un créneau demandé est libre avant validation

### Structure de données

```typescript
// Collection availability-slots
{
  tenant: relationship → tenants
  doctor: relationship → doctors (optionnel, pour tier clinique)
  dayOfWeek: number // 0-6 (dimanche-samedi)
  startTime: string // "09:00"
  endTime: string   // "17:00"
  durationMinutes: number // 30 (durée d'un créneau de consultation)
  bufferMinutes: number   // 15 (pause entre deux consultations)
  isActive: boolean
}
```

### Prompt Phase 2

---

## PHASE 3 — Notifications + cycle de vie complet

### Objectif

Gérer le cycle de vie complet : confirmation, annulation, report, rappels, notifications email/SMS, champs customs par type de RDV.

### Nouveaux composants

1. **`POST /api/bookings/cancel`** — annulation par le patient (lien dans l'email de confirmation)
2. **`POST /api/bookings/reschedule`** — report par le patient
3. **Notifications email** — via Resend ou SendGrid (confirmation + rappel 24h avant)
4. **Notifications SMS** — optionnel, via Twilio ou API marocaine
5. **Champs customs** — formulaire de réservation conditionnel (ex: "Première consultation" → champs obligatoires différents)
6. **Statistiques** — remplir le placeholder "Présence aux rendez-vous" dans ActivityView

### Prompt Phase 3

---

## Plan de migration Cal.com → Schedule-X

1. **Phase 1 déployée** → le widget public utilise Schedule-X, l'agenda dashboard aussi. Les données `calbookings` continuent d'être lues normalement. Cal.com est encore en place (désactivé progressivement).
2. **Phase 2 déployée** → les disponibilités sont gérées dans notre UI. Cal.com n'est plus nécessaire. Suppression du LXC + DB.
3. **Phase 3 déployée** → cycle de vie complet. Suppression du code mort Cal.com (`CalBookingWidget.tsx`, webhook, embed).

---

## Prompt Phase 1 (version Flash)

### LOT SX-1 — Remplacer Cal.com par Schedule-X : agenda interne + réservation publique

#### Étape 1 — Installer Schedule-X, désinstaller Cal.com

```bash
pnpm --filter frontend add @schedule-x/calendar @schedule-x/theme-default @schedule-x/events-service
pnpm --filter frontend remove @calcom/embed-react
```

#### Étape 2 — Wrapper React Schedule-X

**Fichier à créer** : `apps/frontend/src/components/dashboard/ScheduleXCalendar.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { createCalendar, viewWeek, viewMonthGrid } from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import '@schedule-x/theme-default/dist/index.css'

type CalendarEvent = {
  id: string | number
  title: string
  start: string // ISO 8601
  end: string   // ISO 8601
}

type Props = {
  events: CalendarEvent[]
  onDateClick?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
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
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
      })),
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

    return () => {
      calendar.destroy()
    }
  }, [])

  // Mettre à jour les événements
  useEffect(() => {
    if (!calendarRef.current) return
    calendarRef.current.eventsService.set(events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
    })))
  }, [events])

  return <div ref={containerRef} className="schedule-x-calendar" />
}
```

#### Étape 3 — Page publique de réservation

**Fichier à créer** : `apps/frontend/src/components/booking/PublicBookingWidget.tsx`

Remplace `RdvSection.tsx` et `CalBookingWidget.tsx`. Formulaire simple : nom, téléphone, email, date souhaitée (via le calendrier Schedule-X en mode sélection de créneau).

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import ScheduleXCalendar from '@/components/dashboard/ScheduleXCalendar'

export default function PublicBookingWidget() {
  const t = useTranslations('rdv')
  const [step, setStep] = useState<'calendar' | 'form' | 'done'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    setStep('form')
  }

  const handleSubmit = async () => {
    setSaving(true)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), startTime: selectedDate }),
    })
    if (res.ok) setStep('done')
    setSaving(false)
  }

  return (
    <section className="scroll-mt-24 bg-gradient-to-b from-cream-100 to-white px-4 py-20 md:px-6 md:py-28 lg:px-8">
      <div className="mx-auto max-w-container">
        <h2 className="text-center font-heading text-3xl font-bold text-stone-800 md:text-4xl">{t('title')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-lg text-stone-500">{t('subtitle')}</p>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-warm bg-white p-6 shadow-warm-sm">
          {step === 'calendar' && (
            <ScheduleXCalendar events={[]} onDateClick={handleDateClick} />
          )}
          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">Créneau : {selectedDate}</p>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" className="w-full rounded-lg border border-warm bg-white px-4 py-2.5 text-sm" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className="w-full rounded-lg border border-warm bg-white px-4 py-2.5 text-sm" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded-lg border border-warm bg-white px-4 py-2.5 text-sm" />
              <div className="flex gap-3">
                <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white">
                  {saving ? 'Réservation…' : 'Confirmer le rendez-vous'}
                </button>
                <button onClick={() => setStep('calendar')} className="rounded-lg border border-warm bg-white px-6 py-2.5 text-sm">Retour</button>
              </div>
            </div>
          )}
          {step === 'done' && (
            <p className="text-center text-primary-700 font-medium">Rendez-vous confirmé ! Vous recevrez une confirmation par email.</p>
          )}
        </div>
      </div>
    </section>
  )
}
```

#### Étape 4 — API endpoint création de RDV

**Fichier à créer** : `apps/frontend/src/app/api/bookings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, email, startTime } = body

  if (!name || !startTime) {
    return NextResponse.json({ error: 'Nom et créneau requis' }, { status: 400 })
  }

  const slotDate = new Date(startTime)
  const endDate = new Date(slotDate.getTime() + 30 * 60000) // 30 min par défaut

  // Trouver le tenant par domaine (via header x-tenant-id injecté par le middleware)
  const tenantId = request.headers.get('x-tenant-id') || 'default-tenant'

  // Vérifier les conflits
  const conflictCheck = await fetch(
    `${CMS_URL}/api/calbookings?where[tenant][equals]=${tenantId}&where[startTime][less_than]=${endDate.toISOString()}&where[endTime][greater_than]=${slotDate.toISOString()}&where[status][not_equals]=cancelled&depth=0&limit=1`
  )
  const conflicts = await conflictCheck.json()
  if (conflicts.docs?.length > 0) {
    return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
  }

  // Créer le booking
  const res = await fetch(`${CMS_URL}/api/calbookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingUid: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tenant: tenantId,
      eventTypeSlug: 'consultation',
      title: 'Consultation',
      status: 'accepted',
      startTime: slotDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: 30,
      attendeeName: name.trim(),
      attendeeEmail: email?.trim() || '',
      attendeePhone: phone?.trim() || '',
      location: '',
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

#### Étape 5 — Remplacer RdvSection par PublicBookingWidget

**Fichier** : `apps/frontend/src/app/[locale]/page.tsx`

Remplacer l'import de `RdvSection` par `PublicBookingWidget`. Supprimer la prop `calcomSettings` passée depuis le tenant.

Supprimer aussi `CalBookingWidget.tsx` et `RdvCtaButton.tsx` (devenus inutiles).

#### Étape 6 — Agenda dashboard avec Schedule-X

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx`

Ajouter le calendrier Schedule-X en plus de la liste existante :

```tsx
import ScheduleXCalendar from '@/components/dashboard/ScheduleXCalendar'

// Dans le JSX, ajouter AVANT le BookingListView :
<div className="mb-8 rounded-2xl border border-warm bg-white p-4 shadow-warm-sm">
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

#### Étape 7 — Supprimer le code mort Cal.com

- Supprimer `apps/frontend/src/components/booking/CalBookingWidget.tsx`
- Supprimer `apps/frontend/src/components/ui/RdvCtaButton.tsx` (ou le simplifier pour ne plus dispatcher `open-rdv`)
- Dans `Header.tsx`, remplacer le lien `#rdv` par un lien `/fr#rdv` direct (anchor vers la section)
- Désactiver le webhook Cal.com (garder le fichier `calcom-webhook/route.ts` pour référence, mais le commenter)
- Dans l'onboarding (`SignupForm.tsx`, `OnboardingFlow.tsx`), retirer les champs Cal.com

#### Fichiers concernés Phase 1

| Action | Fichier |
|--------|---------|
| Créer | `apps/frontend/src/components/dashboard/ScheduleXCalendar.tsx` |
| Créer | `apps/frontend/src/components/booking/PublicBookingWidget.tsx` |
| Créer | `apps/frontend/src/app/api/bookings/route.ts` |
| Modifier | `apps/frontend/package.json` (swap deps) |
| Modifier | `apps/frontend/src/app/[locale]/page.tsx` (RdvSection → PublicBookingWidget) |
| Modifier | `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx` (+ calendrier) |
| Modifier | `apps/frontend/src/components/layout/Header.tsx` (lien #rdv direct) |
| Modifier | `apps/frontend/src/components/onboarding/SignupForm.tsx` (retirer Cal.com) |
| Modifier | `apps/frontend/src/components/onboarding/OnboardingFlow.tsx` (retirer mentions Cal.com) |
| Supprimer | `apps/frontend/src/components/sections/RdvSection.tsx` |
| Supprimer | `apps/frontend/src/components/booking/CalBookingWidget.tsx` |
| Supprimer | `apps/frontend/src/components/ui/RdvCtaButton.tsx` |
