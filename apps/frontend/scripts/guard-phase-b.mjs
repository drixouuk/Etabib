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

if (violations.length > 0) {
  console.error(`✗ guard-phase-b — ${violations.length} violation(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-phase-b — invariants B2 + B3 respectés');
