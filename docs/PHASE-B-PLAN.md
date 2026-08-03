# Phase B — Plan d'exécution (Agenda Patient)

> Référence : `yuvomi-analysis.md` §8 Phase B (B1-B5). Branche : `feature/phase-b-agenda-patient` (créée depuis `feature/phase-a-design-system`, Phase A non mergée — aucun commit sur `main`).
> Stack : Next.js 16 + Payload CMS v3 (PostgreSQL, apps/cms) + frontend (apps/frontend). Les guards existants (`guard-design.mjs`, `guard-a4.mjs`) restent actifs.

## Ordre d'implémentation

```
B2 ──► B3 ──► B1 ──► B4 ──► B5
```

| Item | Dépend de | Raison |
|---|---|---|
| B2 Parseur d'heure flexible (port TS) | — | Utilitaire partagé ; B3 (saisie créneaux) l'utilise |
| B3 RRULE subset + exceptions + scope | B2 | Touche le modèle de données (Payload) et l'UI de saisie horaire |
| B1 « Look first, edit second » | — | UX indépendante (lecture des RDV/dossiers) ; B3 fournit `describeRRule` en clair pour la vue lecture |
| B4 Persistance vue calendrier + défaut mobile | — | Indépendant (localStorage) |
| B5 Recherche diacritic-insensitive | — | Indépendant (Postgres unaccent côté CMS) |

---

## B2 — Parseur d'heure flexible (port TS)

- **Modifier** `apps/frontend/src/lib/datetime.ts` → port de `toTimeParts`/`parseTimeInput`/`formatTimeInput` de yuvomi `i18n.js` (aucune dépendance) : accepte `0930`, `930`, `09.30`, `9h30`, `9 am` ; normalise au blur

```ts
// lib/datetime.ts — même logique que yuvomi (séparateurs :.,h + compact HMM/HHMM + 12h)
export function parseTimeInput(value: string): string {
  // /^\d{1,2}$/ → heure ; /^(\d{1,2})[:.,hH](\d{2})$/ ; /^\d{3,4}$/ → HMM/HHMM ; /^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i
}
```

- **Consommateurs** : `ScheduleAndSlots.tsx` (open/close), `BookingSheet.tsx`, `PublicBookingWidget.tsx` (remplacer les `<input type="time">` natifs ou la validation actuelle)
- **Guard** (`scripts/guard-phase-b.mjs`, nouveau, branché au pre-commit comme `guard-a4`) : `parseTimeInput` exporté par `lib/datetime.ts` ; les trois fichiers consommateurs le référencent

## B3 — RRULE subset + exceptions + UI de scope (disponibilités)

- **Modifier** `apps/cms/src/collections/AvailabilitySlots.ts` → champs `recurrenceRule` (string iCal : `FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1` + fin `UNTIL` **ou** `COUNT`), `recurrenceEnd`, et `exceptions` (array de dates ISO — jours sans consultation) ; migration Payload
- **Créer** `apps/cms/src/lib/recurrence.ts` → port de `server/services/recurrence.js` (parseRRule/nextOccurrence/matchesRRuleByday) + expansion bornée (fenêtre 2 ans, garde 1000 itérations)

```ts
// lib/recurrence.ts — sous-ensemble FREQ/INTERVAL/BYDAY + UNTIL|COUNT (RFC 5545)
// nextOccurrence: MONTHLY clamp au dernier jour, YEARLY 29/02 → 28/02, UNTIL → null
export function nextOccurrence(base: string, rrule: string): string | null
```

- **Modifier** `apps/frontend/src/app/api/bookings/week-availability/route.ts` → expansion des séries (une disponibilité hebdomadaire produit ses occurrences moins les exceptions)
- **Modifier** `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ScheduleAndSlots.tsx` → édition récurrente + UI de scope partagée sur delete/edit d'une occurrence (select défaut = « ce jour seul », le moins destructeur) : *ce jour / ce jour et suivants (truncate UNTIL) / toute la série*
- **Guard** : `recurrence.ts` n'autorise que FREQ ∈ {DAILY, WEEKLY, MONTHLY, YEARLY} (scan) ; `AvailabilitySlots` déclare `recurrenceRule` + `exceptions`

## B1 — « Look first, edit second » (RDV + dossiers patients)

- **Créer** `apps/frontend/src/components/agenda/RdvDetailView.tsx` → vue lecture seule du rendez-vous (zéro `<input>` → le clavier mobile ne peut pas s'ouvrir, garanti par structure) : date/heure, patient, motif, statut ; bouton « Modifier » qui monte le formulaire existant (lazy mount + jeton d'ancienneté contre les réponses async tardives)
- **Modifier** `apps/frontend/src/components/dashboard/BookingSheet.tsx` → le tap sur un RDV ouvre la vue lecture (présentation : `Sheet` shadcn, popover ancré ≥768px possible) ; la création reste en formulaire ; actions de footer en `force` (pas de fausse question « abandonner ? », règle #625)
- **Créer** `apps/frontend/src/components/patient/PatientDetailView.tsx` (mêmes principes : lignes descripteurs `{icon,label,value}` filtrées si vides, numéros/emails en tap-targets `tel:`/`mailto:`) ; **modifier** `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` → lecture d'abord, édition = action explicite
- **Guard** : les composants `RdvDetailView`/`PatientDetailView` ne contiennent aucun `<input` / `<textarea` (lecture garantie par structure, comme yuvomi) ; `describeRRule` (B3) affiché dans la vue RDV

## B4 — Persistance de la vue calendrier par device

- **Modifier** `apps/frontend/src/components/dashboard/RendezVousCalendarClient.tsx` → vue actuelle (`'mois' | 'semaine'`, useState) persistée en `localStorage` (clé `rdv-calendar-view`), défaut **par device** : mobile (`matchMedia max-width:640px`) → `'semaine'`, desktop → `'mois'` ; restauration au montage, écriture au changement

```ts
// RendezVousCalendarClient.tsx
const saved = typeof window !== 'undefined' ? localStorage.getItem('rdv-calendar-view') : null
const [view, setView] = useState<View>(saved as View ?? (isMobile() ? 'semaine' : 'mois'))
```

- **Guard** : la clé `rdv-calendar-view` est lue au montage et écrite au changement de vue (scan du fichier)

## B5 — Recherche patients diacritic-insensitive (unaccent + pg_trgm)

- **Modifier** `apps/cms` → migration SQL : `CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- **Créer** `apps/cms/src/endpoints/search-patients.ts` → endpoint Payload `GET /api/patients/search?q=` exécutant du SQL drizzle : `WHERE unaccent(full_name) ILIKE unaccent($1)` (ou `unaccent(full_name) % unaccent($1)` trié par similarité) — « muller » matche « Müller », « rachid » matche « Rachid »
- **Modifier** `apps/frontend/src/components/dashboard/PatientSearchBar.tsx` + `PatientSearchAutocomplete.tsx` → appeler l'endpoint (remplace le `contains` Payload actuel, sensible aux accents)
- **Guard** : l'endpoint référence `unaccent` (scan) ; les deux composants de recherche appellent `/api/patients/search`

---

## Ordre de commit (1 commit / item, style conventionnel)

1. `feat(agenda): port flexible time input parser to TS (B2)`
2. `feat(agenda): recurring availability with RRULE subset and scope UI (B3)`
3. `feat(agenda): read-first views for appointments and patient records (B1)`
4. `feat(agenda): persist calendar view per device with mobile default (B4)`
5. `feat(agenda): diacritic-insensitive patient search via unaccent (B5)`

Règles : jamais de commit sur `main` ; chaque commit poussé sur `feature/phase-b-agenda-patient` ; build vert (`pnpm --filter frontend build`) + guards (`guard:design`, `guard-a4`, `guard-phase-b`) ; les guards s'enrichissent dans le commit de leur item (script `guard-phase-b.mjs` créé en B2).
