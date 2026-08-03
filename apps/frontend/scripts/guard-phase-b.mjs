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
 *
 * Usage : pnpm --filter frontend guard:phase-b
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(path.join(FRONTEND_DIR, ...rel.split('/')), 'utf8');

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

if (violations.length > 0) {
  console.error(`✗ guard-phase-b — ${violations.length} violation(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-phase-b — invariants B2 respectés');
