# LOT SX-4 — Sécurité, fuseau horaire & robustesse technique

## Contexte

- Phases 1 & 2 déployées : agenda interne Schedule-X + réservation publique + gestion des disponibilités.
- Un audit a identifié des failles et bugs introduits pendant la migration Cal.com → Schedule-X, à corriger avant d'ouvrir à de vrais patients.
- **Hors scope de ce lot** (déjà prévu ailleurs, ne pas y toucher) : confirmation email, annulation par le patient, rappels 24h, SMS, report de RDV, bouton "Annuler" médecin dans BookingListView, stats de présence.

---

## Étape 1 — Verrouiller l'accès à la collection `calbookings` (CRITIQUE)

**Fichier** : `apps/cms/src/collections/CalBookings.ts`

Actuellement `create`, `update`, `delete` sont à `() => true` — accessible publiquement en direct sur l'API Payload, sans passer par les validations du frontend. N'importe qui peut créer/modifier/supprimer les RDV de n'importe quel cabinet.

Remplacer par :

```typescript
access: {
  read: ({ req: { user } }: any) => {
    if (user?.roles?.includes('superadmin')) return true
    const tid = user?.tenant ? (typeof user.tenant === 'object' ? user.tenant.id : user.tenant) : undefined
    if (!tid) return false
    return { tenant: { equals: tid } }
  },
  create: ({ req }: any) => {
    // Autoriser soit un utilisateur authentifié avec un rôle valide,
    // soit notre service interne (booking public) via clé API partagée.
    const apiKey = req.headers.get?.('x-internal-api-key') || req.headers['x-internal-api-key']
    if (apiKey && apiKey === process.env.INTERNAL_BOOKING_API_KEY) return true
    const roles = req.user?.roles ?? []
    return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor') || roles.includes('secretary')
  },
  update: ({ req: { user } }: any) => {
    if (user?.roles?.includes('superadmin')) return true
    const tid = user?.tenant ? (typeof user.tenant === 'object' ? user.tenant.id : user.tenant) : undefined
    if (!tid) return false
    return { tenant: { equals: tid } }
  },
  delete: ({ req: { user } }: any) => {
    if (user?.roles?.includes('superadmin')) return true
    const tid = user?.tenant ? (typeof user.tenant === 'object' ? user.tenant.id : user.tenant) : undefined
    if (!tid) return false
    return { tenant: { equals: tid } }
  },
},
```

**Important** : `update`/`delete` restent scoping par tenant + auth — donc compatibles avec le futur bouton "Annuler" médecin (SX-3 étape 6), qui passe déjà par `/api/cms-proxy/calbookings/[id]` avec un Bearer token authentifié. Ne rien casser de ce côté.

## Étape 2 — Faire passer la clé API interne côté Next.js

**Fichier** : `apps/frontend/src/app/api/bookings/route.ts`

La création de booking dans `POST` (le `fetch` vers `${CMS_URL}/api/calbookings`) doit maintenant envoyer le header interne :

```typescript
const res = await fetch(`${CMS_URL}/api/calbookings`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-internal-api-key": process.env.INTERNAL_BOOKING_API_KEY!,
  },
  body: JSON.stringify({
    /* ... inchangé ... */
  }),
});
```

Ajouter `INTERNAL_BOOKING_API_KEY` (valeur aléatoire longue) dans les variables d'environnement Coolify des deux services (frontend + CMS), pas dans `.env.example` en clair.

## Étape 3 — Supprimer le fallback CMS_URL fantôme

**Fichiers** : `apps/frontend/src/app/api/bookings/route.ts`, `apps/frontend/src/app/api/bookings/available-slots/route.ts`, `apps/frontend/src/app/api/calcom-webhook/route.ts`, `apps/frontend/src/app/api/cms-proxy/[...path]/route.ts`

Remplacer partout :

```typescript
const CMS_URL =
  process.env.NEXT_PUBLIC_CMS_URL || "https://dr-pediatre-cms.vercel.app";
```

par :

```typescript
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL;
if (!CMS_URL) throw new Error("NEXT_PUBLIC_CMS_URL manquant");
```

Un échec explicite au démarrage vaut mieux qu'un fallback silencieux vers une URL morte.

## Étape 4 — Fuseau horaire Maroc dynamique (pas de +01:00 codé en dur)

**Fichier à créer** : `apps/frontend/src/lib/morocco-time.ts`

```typescript
/**
 * Interprète une chaîne "YYYY-MM-DDTHH:mm" comme une heure LOCALE marocaine
 * et retourne le Date UTC correspondant, sans supposer un offset fixe.
 * Le Maroc alterne GMT+1 / GMT+0 (Ramadan) et abandonne le DST le 20 sept. 2026.
 */
export function moroccoWallTimeToUTC(wallTime: string): Date {
  const naive = new Date(wallTime + "Z"); // traité comme si c'était déjà UTC
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt
    .formatToParts(naive)
    .reduce((acc: Record<string, string>, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  const asIfUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  const offsetMs = asIfUTC - naive.getTime();
  return new Date(naive.getTime() - offsetMs);
}
```

**Fichier** : `apps/frontend/src/app/api/bookings/route.ts`

Remplacer :

```typescript
const moroccoDate = new Date(startTime + "+01:00");
```

par :

```typescript
import { moroccoWallTimeToUTC } from "@/lib/morocco-time";
const moroccoDate = moroccoWallTimeToUTC(startTime);
```

## Étape 5 — Calendrier : recharger les événements quand on change de vue/période

**Fichier** : `apps/frontend/src/components/dashboard/ScheduleXCalendar.tsx`

Ajouter un callback `onRangeUpdate` qui remonte la plage visible au parent :

```typescript
type Props = {
  events: CalendarEvent[]
  onDateClick?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onRangeChange?: (start: string, end: string) => void
}
// ... dans callbacks de createCalendar :
onRangeUpdate(range) {
  onRangeChange?.(range.start.toString(), range.end.toString())
},
```

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx`

Convertir en composant avec état client pour la plage affichée (garder le fetch initial serveur pour "aujourd'hui", mais ajouter un fetch client au changement de plage) :

**Fichier à créer** : `apps/frontend/src/app/api/cms-proxy-bookings-range/route.ts` (ou réutiliser `cms-proxy` existant avec les bons paramètres `where[startTime]` calculés côté client à partir de `onRangeChange`)

Le composant `ScheduleXCalendar` doit être élevé dans un wrapper client (`RendezVousCalendarClient.tsx`) qui garde `events` en state, initialisé avec les données du jour passées par le serveur, puis refetch via `/api/cms-proxy/calbookings?where[tenant][equals]=...&where[startTime][...]` à chaque `onRangeChange`.

## Étape 6 — Localisation du calendrier (fr/en/ar RTL/tzm)

**Fichier** : `apps/frontend/src/components/dashboard/ScheduleXCalendar.tsx`

Ajouter une prop `locale: string` et `isRTL: boolean`, passés depuis la page (via `useLocale()` de next-intl). Configurer `createCalendar({ locale, ... })` si l'option existe dans `@schedule-x/calendar` v4.6, sinon a minima envelopper le conteneur avec `dir={isRTL ? 'rtl' : 'ltr'}` pour l'arabe :

```tsx
<div
  ref={containerRef}
  dir={isRTL ? "rtl" : "ltr"}
  className="schedule-x-calendar"
/>
```

Vérifier dans la doc `@schedule-x/calendar` la clé de config locale disponible (`fr-FR`, etc.) avant d'implémenter — si non supportée nativement par la lib, au minimum traduire les labels de navigation visibles autour du composant.

## Étape 7 — Limiter le double-booking en base

**Fichier à créer** : migration `payload migrate:create` après ajout d'une contrainte

Ajouter un index unique sur `(tenant_id, start_time)` dans `calbookings` pour empêcher deux réservations actives (`status != cancelled`) au même horaire exact pour le même tenant :

```sql
CREATE UNIQUE INDEX "calbookings_tenant_starttime_active_idx"
ON "calbookings" ("tenant_id", "start_time")
WHERE status != 'cancelled';
```

Générer via `npx payload migrate:create add_calbookings_unique_slot`, écrire le SQL ci-dessus dans `up()`, l'inverse (`DROP INDEX`) dans `down()`. Committer `.ts` + `.json` immédiatement.

Gérer l'erreur de contrainte violée côté `POST /api/bookings/route.ts` : si l'insert échoue avec une erreur de contrainte unique, retourner `409 { error: 'Créneau déjà réservé' }` au lieu d'une 500 générique.

## Étape 8 — Scoper la lecture publique de `availability-slots`

**Fichier** : `apps/cms/src/collections/AvailabilitySlots.ts`

`read: () => true` expose les horaires de tous les cabinets sans filtre. Le widget public a besoin de lire sans authentification, mais doit être forcé à filtrer par tenant :

```typescript
read: ({ req }: any) => {
  if (req.user?.roles?.includes('superadmin')) return true
  const tid = req.user?.tenant ? (typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant) : undefined
  if (tid) return { tenant: { equals: tid } }
  // Accès public (widget de réservation) : autorisé mais uniquement en lecture filtrée,
  // Payload appliquera quand même le where[tenant][equals] passé en query par le frontend.
  return true
},
```

(Le filtrage réel par tenant reste porté par la query du frontend comme aujourd'hui — cette étape documente juste l'intention et prépare le terrain si un rôle authentifié doit un jour restreindre l'accès à son propre tenant uniquement, ce qui n'était pas le cas avant.)

---

## Fichiers Phase 4

| Action         | Fichier                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Modifier       | `apps/cms/src/collections/CalBookings.ts` (access control)                                                |
| Modifier       | `apps/cms/src/collections/AvailabilitySlots.ts` (read access)                                             |
| Modifier       | `apps/frontend/src/app/api/bookings/route.ts` (clé API + fuseau horaire + gestion conflit 409)            |
| Modifier       | `apps/frontend/src/app/api/bookings/available-slots/route.ts` (retirer fallback CMS_URL)                  |
| Modifier       | `apps/frontend/src/app/api/calcom-webhook/route.ts` (retirer fallback CMS_URL)                            |
| Modifier       | `apps/frontend/src/app/api/cms-proxy/[...path]/route.ts` (retirer fallback CMS_URL)                       |
| Créer          | `apps/frontend/src/lib/morocco-time.ts`                                                                   |
| Modifier       | `apps/frontend/src/components/dashboard/ScheduleXCalendar.tsx` (onRangeChange, locale, RTL)               |
| Modifier/Créer | `apps/frontend/src/app/[locale]/(dashboard)/dashboard/rendez-vous/page.tsx` + wrapper client pour refetch |
| Créer          | Migration Payload `add_calbookings_unique_slot`                                                           |
| Env            | Ajouter `INTERNAL_BOOKING_API_KEY` sur Coolify (frontend + CMS)                                           |
