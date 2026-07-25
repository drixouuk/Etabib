# Issue : Vue Rendez-vous Cal.com (webhooks) + fix vaccination

## Contexte

- Cal.com auto-hébergé (`cal.diy`) — **pas de version commerciale**, donc pas d'API key. Impossible d'utiliser l'API REST v2.
- Alternative retenue : **webhooks Cal.com natifs** (disponibles même en open source). Cal.com envoie les événements à notre endpoint, on les stocke en local, la page Rendez-vous lit depuis notre store.
- Avantages : temps réel, zéro API key, données sous notre contrôle, pas de latence réseau à chaque chargement de page.
- Cal.com est déjà en place côté infra (`calcom.drixou.uk`), intégré en front public via `@calcom/embed-react`.
- La sidebar praticien a un item "Rendez-vous" **désactivé** (`href="#"`, `disabled: true`).

---

## Architecture webhook

```
Cal.com (auto-hébergé)
    │
    │  POST /api/calcom-webhook?secret=xxx
    │  (BOOKING_CREATED / BOOKING_RESCHEDULED / BOOKING_CANCELLED)
    ▼
Frontend API route (Next.js)
    │
    │  Résout eventTypeSlug → tenant via CMS
    │  Upsert dans collection calbookings via CMS
    ▼
Payload CMS (stockage)
    │
    │  fetchCMS() lit les bookings
    ▼
Page /dashboard/rendez-vous (Vue Rendez-vous)
```

## Prérequis infra (Driss)

### 1. Variable d'environnement

Ajouter dans Vercel + `.env.local` :

```
CALCOM_WEBHOOK_SECRET=<clé-aléatoire-de-32-caractères-minimum>
```

> Générer avec : `openssl rand -hex 32`

### 2. Configuration Cal.com

Dans l'admin Cal.com (`calcom.drixou.uk` → Settings → Webhooks → Add Webhook) :

- **URL** : `https://votre-frontend.vercel.app/api/calcom-webhook?secret=<CALCOM_WEBHOOK_SECRET>`
- **Événements** : `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`
- **Payload type** : JSON

---

## Travail à faire

### 1. Fix vaccination : filtre tenant manquant

**Fichier** : `apps/frontend/src/components/dashboard/VaccinationAlerts.tsx`

Ligne 22, remplacer :
```ts
fetchCMS<{ docs: VaccinationData[] }>(`/api/vaccinations?limit=1000&depth=0`, { revalidate: 0 }),
```
par :
```ts
fetchCMS<{ docs: VaccinationData[] }>(`/api/vaccinations?where[tenant][equals]=${tenantId}&limit=1000&depth=0`, { revalidate: 0 }),
```

Défensif (access control Payload filtre déjà), mais évite une requête inutilement large.

### 2. Collection CMS `calbookings`

**Fichier à créer** : `apps/cms/src/collections/CalBookings.ts`

Nouvelle collection Payload pour stocker les rendez-vous Cal.com :

```typescript
import type { CollectionConfig } from 'payload'

export const CalBookings: CollectionConfig = {
  slug: 'calbookings',
  admin: {
    useAsTitle: 'bookingUid',
    defaultColumns: ['bookingUid', 'attendeeName', 'startTime', 'status', 'tenant'],
    group: 'Cabinet',
  },
  access: {
    // Même patterns que les autres collections : superadmin voit tout,
    // tenant_admin + doctor voient leur tenant
    read: ({ req: { user } }: any) => {
      if (user?.roles?.includes('superadmin')) return true
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    // Seul le système (webhook) crée/modifie/supprime — pas l'utilisateur direct
    create: () => true,   // le webhook appelle sans user auth
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: 'bookingUid', type: 'text', unique: true, required: true, label: 'UID Cal.com' },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, admin: { readOnly: true } },
    { name: 'eventTypeSlug', type: 'text', required: true, label: 'Slug événement' },
    { name: 'title', type: 'text', label: 'Titre' },
    { name: 'status', type: 'select', options: [
      { label: 'Confirmé', value: 'accepted' },
      { label: 'En attente', value: 'pending' },
      { label: 'Annulé', value: 'cancelled' },
      { label: 'Refusé', value: 'rejected' },
    ], label: 'Statut' },
    { name: 'startTime', type: 'date', required: true, label: 'Début', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'endTime', type: 'date', required: true, label: 'Fin', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'attendeeName', type: 'text', label: 'Patient' },
    { name: 'attendeeEmail', type: 'text', label: 'Email patient' },
    { name: 'attendeePhone', type: 'text', label: 'Téléphone patient' },
    { name: 'attendeeTimezone', type: 'text', label: 'Fuseau horaire' },
    { name: 'location', type: 'text', label: 'Lien visio / lieu' },
    { name: 'duration', type: 'number', label: 'Durée (minutes)' },
    { name: 'rescheduledFromUid', type: 'text', label: 'Reschedulé depuis UID' },
    { name: 'rescheduledToUid', type: 'text', label: 'Reschedulé vers UID' },
    { name: 'cancellationReason', type: 'textarea', label: 'Motif annulation' },
    { name: 'responses', type: 'json', label: 'Réponses formulaire' },
  ],
}
```

**IMPORTANT** : Après création de la collection, générer la migration :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

La collection doit être enregistrée dans `apps/cms/src/payload.config.ts` (vérifier le pattern des autres collections).

### 3. Endpoint webhook Cal.com

**Fichier à créer** : `apps/frontend/src/app/api/calcom-webhook/route.ts`

Endpoint POST qui reçoit les webhooks Cal.com :

```typescript
import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'
const WEBHOOK_SECRET = process.env.CALCOM_WEBHOOK_SECRET || 'dev-secret-change-me'

// Payload de webhook Cal.com (format standard)
type CalWebhookPayload = {
  triggerEvent: string  // 'BOOKING_CREATED' | 'BOOKING_RESCHEDULED' | 'BOOKING_CANCELLED'
  payload: {
    uid: string
    title: string
    startTime: string
    endTime: string
    duration?: number
    status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
    eventType: { id: number; slug: string }
    organizer: { name: string; email: string; timeZone: string }
    attendees: { name: string; email: string; timeZone: string; phoneNumber?: string }[]
    location?: string | null
    metadata?: Record<string, unknown>
    responses?: Record<string, unknown>
    rescheduledFromUid?: string
    rescheduledToUid?: string
    cancellationReason?: string
  }
}

async function cmsApi(method: string, path: string, body?: unknown) {
  const res = await fetch(`${CMS_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data: json }
}

// Mapper status Cal.com → notre enum
function mapStatus(calStatus: string): 'accepted' | 'pending' | 'cancelled' | 'rejected' {
  const map: Record<string, 'accepted' | 'pending' | 'cancelled' | 'rejected'> = {
    ACCEPTED: 'accepted',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected',
    // variantes lowercase (certaines versions de Cal.com peuvent les utiliser)
    accepted: 'accepted',
    pending: 'pending',
    cancelled: 'cancelled',
    rejected: 'rejected',
  }
  return map[calStatus] || 'pending'
}

export async function POST(request: NextRequest) {
  // Validation du secret
  const secret = request.nextUrl.searchParams.get('secret')
  if (!secret || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CalWebhookPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { triggerEvent, payload } = body
  if (!triggerEvent || !payload?.uid) {
    return NextResponse.json({ error: 'Missing triggerEvent or payload.uid' }, { status: 400 })
  }

  const eventSlug = payload.eventType?.slug
  if (!eventSlug) {
    return NextResponse.json({ error: 'Missing eventType.slug — cannot resolve tenant' }, { status: 400 })
  }

  // Résoudre le tenant par eventSlug
  const tenantRes = await cmsApi('GET', `/api/tenants?where[calcomSettings.eventSlug][equals]=${encodeURIComponent(eventSlug)}&depth=0&limit=1`)
  const tenantDocs = tenantRes.data?.docs
  const tenantId = Array.isArray(tenantDocs) && tenantDocs.length > 0 ? tenantDocs[0].id : null

  if (!tenantId) {
    return NextResponse.json({ error: `No tenant found for event slug: ${eventSlug}`, skipped: true }, { status: 200 })
    // 200 et non 404 — ce n'est pas une erreur côté Cal.com, juste pas de match
  }

  const eventHandlers: Record<string, () => Promise<NextResponse>> = {
    BOOKING_CREATED: async () => {
      const bookingData = {
        bookingUid: payload.uid,
        tenant: tenantId,
        eventTypeSlug: eventSlug,
        title: payload.title,
        status: mapStatus(payload.status),
        startTime: payload.startTime,
        endTime: payload.endTime,
        duration: payload.duration ?? (new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime()) / 60000,
        attendeeName: payload.attendees?.[0]?.name || '',
        attendeeEmail: payload.attendees?.[0]?.email || '',
        attendeePhone: payload.attendees?.[0]?.phoneNumber || '',
        attendeeTimezone: payload.attendees?.[0]?.timeZone || '',
        location: payload.location || '',
        responses: payload.responses || {},
      }
      const res = await cmsApi('POST', '/api/calbookings', bookingData)
      return NextResponse.json({ success: true, action: 'created', id: res.data?.doc?.id }, { status: res.ok ? 200 : 500 })
    },

    BOOKING_RESCHEDULED: async () => {
      // Trouver le booking existant par UID
      const existing = await cmsApi('GET', `/api/calbookings?where[bookingUid][equals]=${payload.uid}&limit=1&depth=0`)
      const existingDoc = existing.data?.docs?.[0]
      
      if (!existingDoc) {
        // Pas trouvé → créer (cas où le BOOKING_CREATED a été manqué)
        const bookingData = {
          bookingUid: payload.uid,
          tenant: tenantId,
          eventTypeSlug: eventSlug,
          title: payload.title,
          status: mapStatus(payload.status),
          startTime: payload.startTime,
          endTime: payload.endTime,
          duration: payload.duration ?? (new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime()) / 60000,
          attendeeName: payload.attendees?.[0]?.name || '',
          attendeeEmail: payload.attendees?.[0]?.email || '',
          attendeePhone: payload.attendees?.[0]?.phoneNumber || '',
          attendeeTimezone: payload.attendees?.[0]?.timeZone || '',
          location: payload.location || '',
        }
        const res = await cmsApi('POST', '/api/calbookings', bookingData)
        return NextResponse.json({ success: true, action: 'created-from-reschedule', id: res.data?.doc?.id }, { status: res.ok ? 200 : 500 })
      }
      // Mettre à jour
      const updateRes = await cmsApi('PATCH', `/api/calbookings/${existingDoc.id}`, {
        startTime: payload.startTime,
        endTime: payload.endTime,
        duration: payload.duration ?? (new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime()) / 60000,
        rescheduledFromUid: payload.rescheduledFromUid || null,
      })
      return NextResponse.json({ success: true, action: 'rescheduled', id: existingDoc.id }, { status: updateRes.ok ? 200 : 500 })
    },

    BOOKING_CANCELLED: async () => {
      // Trouver le booking existant par UID
      const existing = await cmsApi('GET', `/api/calbookings?where[bookingUid][equals]=${payload.uid}&limit=1&depth=0`)
      const existingDoc = existing.data?.docs?.[0]
      if (!existingDoc) {
        return NextResponse.json({ success: true, action: 'cancel-skipped', reason: 'not-found' }, { status: 200 })
      }
      const updateRes = await cmsApi('PATCH', `/api/calbookings/${existingDoc.id}`, {
        status: 'cancelled',
        cancellationReason: payload.cancellationReason || null,
      })
      return NextResponse.json({ success: true, action: 'cancelled', id: existingDoc.id }, { status: updateRes.ok ? 200 : 500 })
    },
  }

  const handler = eventHandlers[triggerEvent]
  if (!handler) {
    return NextResponse.json({ success: true, action: 'ignored', triggerEvent }, { status: 200 })
  }

  return handler()
}
```

### 4. Page Rendez-vous

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx`

Server component :

```tsx
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import BookingListView from '@/components/dashboard/BookingListView'
import { Calendar } from 'lucide-react'

type CalBooking = {
  id: string
  bookingUid: string
  title: string
  status: 'accepted' | 'pending' | 'cancelled' | 'rejected'
  startTime: string
  endTime: string
  duration: number
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string
  location: string | null
  cancellationReason?: string | null
  responses?: Record<string, unknown>
  createdAt: string
}

export default async function RendezVousPage() {
  const user = await requireAuth()
  const tenantId = typeof user.tenant === 'object' ? (user.tenant as any).id : user.tenant

  // Calculer la plage horaire du jour (UTC, début de journée)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const data = await fetchCMS<{ docs: CalBooking[] }>(
    `/api/calbookings?where[tenant][equals]=${tenantId}&where[startTime][greater_than_equal]=${today.toISOString()}&where[startTime][less_than]=${tomorrow.toISOString()}&sort=startTime&depth=0&limit=100`,
    { revalidate: 0 },
  )
  const bookings = data?.docs ?? []

  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-stone-800">Rendez-vous</h1>
      <p className="mt-1 text-sm text-stone-500 capitalize">{dateLabel}</p>
      <div className="mt-6">
        <BookingListView bookings={bookings} />
      </div>
    </div>
  )
}
```

### 5. Composant BookingListView

**Fichier à créer** : `apps/frontend/src/components/dashboard/BookingListView.tsx`

Composant client (`'use client'`) :

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Clock, Mail, Phone, Video, Calendar, MapPin } from 'lucide-react'
import type { CalBooking } from '@/app/[locale]/(dashboard)/dashboard/rendez-vous/page'  // ou défini localement

type Props = {
  bookings: CalBooking[]
}

export default function BookingListView({ bookings }: Props) {
  const [viewMode, setViewMode] = useState<'upcoming' | 'past'>('upcoming')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const now = new Date()

  const { upcoming, past } = useMemo(() => {
    const u = bookings
      .filter((b) => new Date(b.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    const p = bookings
      .filter((b) => new Date(b.startTime) < now)
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    return { upcoming: u, past: p }
  }, [bookings])

  const activeList = viewMode === 'upcoming' ? upcoming : past
  const visibleItems = activeList.slice(0, page * PER_PAGE)
  const hasMore = activeList.length > page * PER_PAGE

  const statusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Confirmé</span>
      case 'pending': return <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">En attente</span>
      case 'cancelled': return <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 line-through">Annulé</span>
      case 'rejected': return <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">Refusé</span>
      default: return null
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}` : `${h}h`
  }

  return (
    <div>
      {/* Segmented control */}
      <div className="mb-6 inline-flex rounded-lg bg-stone-100 p-0.5">
        <button
          onClick={() => { setViewMode('upcoming'); setPage(1) }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            viewMode === 'upcoming' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          À venir ({upcoming.length})
        </button>
        <button
          onClick={() => { setViewMode('past'); setPage(1) }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            viewMode === 'past' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Passés ({past.length})
        </button>
      </div>

      {/* Empty state */}
      {visibleItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-12 text-center shadow-sm">
          <Calendar className="size-12 text-stone-300" />
          <p className="mt-4 text-sm font-medium text-stone-500">
            {viewMode === 'upcoming' ? "Aucun rendez-vous à venir aujourd'hui" : "Aucun rendez-vous passé aujourd'hui"}
          </p>
        </div>
      )}

      {/* Booking cards */}
      <div className="space-y-3">
        {visibleItems.map((booking) => (
          <div
            key={booking.id}
            className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${
              booking.status === 'cancelled' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1 text-sm font-semibold text-primary-700">
                  <Clock className="size-3.5" />
                  {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                </span>
                <span className="text-xs text-stone-400">({formatDuration(booking.duration)})</span>
              </div>
              {statusBadge(booking.status)}
            </div>

            <div className="mt-3 space-y-1">
              <p className="font-heading text-base font-semibold text-stone-800">{booking.attendeeName || 'Patient'}</p>
              {booking.title && <p className="text-sm text-stone-500">{booking.title}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                {booking.attendeeEmail && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {booking.attendeeEmail}
                  </span>
                )}
                {booking.attendeePhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {booking.attendeePhone}
                  </span>
                )}
              </div>
            </div>

            {booking.location && booking.status !== 'cancelled' && (
              <div className="mt-2">
                <a
                  href={booking.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors duration-200 hover:bg-primary-100"
                >
                  {booking.location.startsWith('http') ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
                  {booking.location.startsWith('http') ? 'Rejoindre la visio' : booking.location}
                </a>
              </div>
            )}

            {booking.cancellationReason && (
              <p className="mt-2 text-xs italic text-stone-400">Motif : {booking.cancellationReason}</p>
            )}
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-4 w-full rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium text-primary-600 transition-colors duration-200 hover:bg-stone-50 hover:text-primary-700"
        >
          Voir plus ({activeList.length - visibleItems.length} restants)
        </button>
      )}
    </div>
  )
}
```

### 6. Activer le lien Sidebar

**Fichier** : `apps/frontend/src/components/dashboard/Sidebar.tsx`

Remplacer la ligne :
```tsx
{ label: 'Rendez-vous', href: '#', icon: <Calendar className="size-4" />, disabled: true },
```
par :
```tsx
{ label: 'Rendez-vous', href: '/dashboard/rendez-vous', icon: <Calendar className="size-4" /> },
```

### 7. Enregistrer la collection CMS

**Fichier** : `apps/cms/src/payload.config.ts`

Ajouter `CalBookings` dans l'array `collections`. Suivre le même pattern d'import que les autres collections.

---

## Fallback si aucun booking

Si le tenant n'a pas de `calcomSettings` (pas configuré), la page affiche une carte info au lieu d'une erreur :

```
📅 Calendrier non configuré
Pour activer la prise de rendez-vous, configurez Cal.com dans les paramètres.
```

Cependant, comme le dashboard est réservé aux tiers `dossier` et `clinique` (qui ont Cal.com), ce cas ne devrait pas arriver souvent. Le gérer quand même pour la robustesse.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/cms/src/collections/CalBookings.ts` | Collection Payload pour stocker les bookings |
| `apps/frontend/src/app/api/calcom-webhook/route.ts` | Endpoint webhook (reçoit de Cal.com, stocke dans CMS) |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx` | Page serveur Rendez-vous |
| `apps/frontend/src/components/dashboard/BookingListView.tsx` | Composant client liste de bookings |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/payload.config.ts` | Enregistrer `CalBookings` |
| `apps/frontend/src/components/dashboard/Sidebar.tsx` | Activer le lien Rendez-vous |
| `apps/frontend/src/components/dashboard/VaccinationAlerts.tsx` | Filtre tenant sur le fetch vaccinations |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration CalBookings | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après ajout collection CMS. Ne jamais utiliser `push: true`.
2. **Design system** : tokens sémantiques uniquement. Pas de couleurs Tailwind brutes.
3. **Composants serveur par défaut** — `'use client'` uniquement pour `BookingListView`.
4. **Sécurité webhook** : valider le `secret` en query param AVANT toute autre opération. Répondre 401 si invalide.
5. **Pas de `any`** sans justification.
6. **Espace praticien FR-only** — pas d'i18n à modifier.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit && npx next build
```

Aucun commit si le build échoue.

---

## Ordre d'implémentation

1. `CalBookings.ts` — collection CMS
2. Migration CMS (`payload migrate:create` + `payload migrate`)
3. `payload.config.ts` — enregistrer la collection
4. `api/calcom-webhook/route.ts` — endpoint webhook
5. `BookingListView.tsx` — composant client
6. `/dashboard/rendez-vous/page.tsx` — page serveur
7. `Sidebar.tsx` — activer le lien
8. `VaccinationAlerts.tsx` — fix filtre tenant
9. Build gate
