#!/usr/bin/env node
/**
 * Guard Phase B — invariants agenda patient.
 *
 *   B2. Parseur d'heure flexible :
 *       (a) lib/datetime.ts exporte parseTimeInput ;
 *       (b) components/ui/time-input.tsx l'utilise (composant partagé) ;
 *       (c) ScheduleAndSlots.tsx et BookingSheet.tsx utilisent TimeInput et
 *           ne contiennent plus d'input natif type="time"/type="datetime-local" ;
 *       (d) PublicBookingWidget = exception documentée : l'heure s'y choisit
 *           par chips de créneaux (pas de saisie libre).
 *   B3. Récurrence des disponibilités :
 *       (a) l'engine complet (parseRRule/expandSeries) vit dans
 *           apps/cms/src/lib/recurrence.ts ;
 *       (b) AvailabilitySlots.ts déclare recurrenceRule / recurrenceEnd /
 *           exceptions ;
 *       (c) la route week-availability expanse via lib/rrule.ts (slotOccursOn) ;
 *       (d) ScheduleAndSlots.tsx offre le choix de portée avec défaut « seul »
 *           (option la moins destructive), séries locales uniquement.
 *   B1. « Look first, edit second » : RdvDetailView.tsx et
 *       PatientDetailView.tsx sont des vues LECTURE SEULE — aucun
 *       <input>/<textarea>/<select> (le clavier ne peut structurellement pas
 *       s'ouvrir) ; RdvDetailView affiche la récurrence via describeRRule ;
 *       les deux vues portent un jeton d'ancienneté (viewSeq).
 *   B4. Persistance de la vue calendrier : clé 'rdv-calendar-view' lue au
 *       montage (localStorage) avec défaut par device explicite (pointer:
 *       coarse → semaine, sinon mois) ; choix manuel persisté ; début de
 *       semaine configurable ('rdv-week-start', défaut lundi).
 *   B5. Recherche patients diacritic-insensitive : l'endpoint CMS
 *       (Patients.ts) utilise unaccent + pg_trgm avec garde-fous ; les
 *       composants de recherche appellent /patients/search et ne requêtent
 *       plus en contains direct.
 *
 * Usage : pnpm --filter frontend guard:phase-b
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(path.join(FRONTEND_DIR, ...rel.split('/')), 'utf8');
const REPO_DIR = path.resolve(FRONTEND_DIR, '..', '..');
const readRepo = (rel) => readFileSync(path.join(REPO_DIR, ...rel.split('/')), 'utf8');

const violations = [];

// B2a — le parseur est exporté
const datetime = read('src/lib/datetime.ts');
if (!/export function parseTimeInput\b/.test(datetime)) {
  violations.push('src/lib/datetime.ts — parseTimeInput non exporté (B2)');
}

// B2b — le composant partagé l'utilise
const timeInput = read('src/components/ui/time-input.tsx');
if (!/parseTimeInput|formatTimeInput/.test(timeInput)) {
  violations.push('src/components/ui/time-input.tsx — ne référence pas le parseur (B2)');
}

// B2c — consommateurs branchés, inputs natifs retirés
const consumers = ['src/app/[locale]/(dashboard)/dashboard/settings/ScheduleAndSlots.tsx', 'src/components/dashboard/BookingSheet.tsx'];
for (const file of consumers) {
  const src = read(file);
  if (!/\bTimeInput\b/.test(src)) {
    violations.push(`${file} — n'utilise pas TimeInput (B2)`);
  }
  if (/type="time"|type="datetime-local"/.test(src)) {
    violations.push(`${file} — input natif type="time"/type="datetime-local" restant (B2)`);
  }
}

// B2d — exception documentée : pas de saisie libre dans le widget public
const publicWidget = read('src/components/booking/PublicBookingWidget.tsx');
if (/type="time"|type="datetime-local"/.test(publicWidget)) {
  violations.push(
    'src/components/booking/PublicBookingWidget.tsx — input temps natif inattendu (B2, exception documentée : sélection par chips)',
  );
}

// B3a — l'engine complet vit côté CMS et est testé
const recurrence = readRepo('apps/cms/src/lib/recurrence.ts');
for (const fn of ['parseRRule', 'expandSeries', 'nextOccurrence']) {
  if (!new RegExp(`export function ${fn}\\b`).test(recurrence)) {
    violations.push(`apps/cms/src/lib/recurrence.ts — ${fn} non exporté (B3)`);
  }
}

// B3b — la collection porte les champs de récurrence
const availabilityCollection = readRepo('apps/cms/src/collections/AvailabilitySlots.ts');
for (const field of ['recurrenceRule', 'recurrenceEnd', 'exceptions']) {
  if (!new RegExp(`name: '${field}'`).test(availabilityCollection)) {
    violations.push(`apps/cms/src/collections/AvailabilitySlots.ts — champ ${field} manquant (B3)`);
  }
}

// B3c — la route expanse via le matcher partagé
const route = read('src/app/api/bookings/week-availability/route.ts');
if (!route.includes('slotOccursOn') || !route.includes("@/lib/rrule")) {
  violations.push('week-availability/route.ts — doit expanser via slotOccursOn (lib/rrule) (B3)');
}

// B3d — UI de portée avec défaut « seul » (moins destructif), séries locales
const settings = read('src/app/[locale]/(dashboard)/dashboard/settings/ScheduleAndSlots.tsx');
if (!/scope: 'seul'/.test(settings) || !/value="seul">Ce créneau seul \(défaut\)/.test(settings)) {
  violations.push('ScheduleAndSlots.tsx — choix de portée absent ou défaut ≠ « Ce créneau seul » (B3)');
}
if (!/nextOccurrenceDate\(/.test(settings)) {
  violations.push('ScheduleAndSlots.tsx — n’utilise pas nextOccurrenceDate pour la prochaine occurrence (B3)');
}

// B1 — vues lecture seule : zéro champ de saisie, récurrence en clair, jeton
const detailViews = ['src/components/agenda/RdvDetailView.tsx', 'src/components/patient/PatientDetailView.tsx'];
for (const file of detailViews) {
  const src = read(file);
  if (/<input|<textarea|<select/.test(src)) {
    violations.push(`${file} — vue lecture avec champ de saisie (<input>/<textarea>/<select>) : le clavier pourrait s'ouvrir (B1)`);
  }
  if (!/viewSeq/.test(src)) {
    violations.push(`${file} — jeton d'ancienneté (viewSeq) manquant (B1)`);
  }
}
const rdvDetail = read('src/components/agenda/RdvDetailView.tsx');
if (!rdvDetail.includes('describeRRule')) {
  violations.push('RdvDetailView.tsx — récurrence non affichée via describeRRule (B1)');
}
const patientDetail = read('src/components/patient/PatientDetailView.tsx');
if (!patientDetail.includes('computeAge')) {
  violations.push('PatientDetailView.tsx — âge non affiché (computeAge) (B1)');
}

// B4 — persistance de la vue + défaut par device + début de semaine
const calendar = read('src/components/dashboard/RendezVousCalendarClient.tsx');
if (!calendar.includes("'rdv-calendar-view'") || !calendar.includes('readStorage(VIEW_STORAGE_KEY)')) {
  violations.push('RendezVousCalendarClient.tsx — vue non lue depuis localStorage au montage (B4)');
}
if (!calendar.includes('(pointer: coarse)')) {
  violations.push('RendezVousCalendarClient.tsx — défaut par device manquant (pointer: coarse → semaine) (B4)');
}
if (!calendar.includes('writeStorage(VIEW_STORAGE_KEY, v)')) {
  violations.push('RendezVousCalendarClient.tsx — choix manuel non persisté (B4)');
}
if (!calendar.includes("'rdv-week-start'") || !calendar.includes("'monday'")) {
  violations.push('RendezVousCalendarClient.tsx — début de semaine configurable (défaut lundi) manquant (B4)');
}
if (!calendar.includes('const [mounted, setMounted] = useState(false)')) {
  violations.push(
    'RendezVousCalendarClient.tsx — flag mounted manquant : localStorage/matchMedia lus dans l\'initialiseur paresseux causeraient un mismatch d\'hydratation (B4)',
  );
}

// B5 — recherche diacritic-insensitive
const patientsCollection = readRepo('apps/cms/src/collections/Patients.ts');
if (!patientsCollection.includes('unaccent') || !patientsCollection.includes("path: '/search'")) {
  violations.push('apps/cms/src/collections/Patients.ts — endpoint /search avec unaccent manquant (B5)');
}
const migrationB5 = readRepo('apps/cms/src/migrations/20260803_add_unaccent_search.ts');
if (!migrationB5.includes('CREATE EXTENSION IF NOT EXISTS unaccent') || !migrationB5.includes('CREATE EXTENSION IF NOT EXISTS pg_trgm')) {
  violations.push('migration 20260803_add_unaccent_search.ts — extensions unaccent/pg_trgm manquantes (B5)');
}
const searchComponents = [
  'src/components/dashboard/PatientSearchBar.tsx',
  'src/app/[locale]/(dashboard)/dashboard/patients/PatientSearchAutocomplete.tsx',
];
for (const file of searchComponents) {
  const src = read(file);
  if (src.includes('[fullName][contains]') || src.includes('[nationalId][contains]')) {
    violations.push(`${file} — requête contains directe encore présente (B5)`);
  }
  if (!src.includes('patients/search')) {
    violations.push(`${file} — endpoint /patients/search non utilisé (B5)`);
  }
}

if (violations.length > 0) {
  console.error(`✗ guard-phase-b — ${violations.length} violation(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-phase-b — invariants B2 + B3 respectés');
