#!/usr/bin/env node
/**
 * Guard A4 — Propriétés directionnelles LOGIQUES (RTL).
 *
 * S'exécute sur le STAGING (git diff --cached --unified=0) : toute NOUVELLE
 * utilité directionnelle physique ajoutée dans apps/frontend/src fait
 * échouer le commit.
 *
 *   physiques interdites (nouvelles)  →  équivalent logique
 *   ml-* / mr-*                        →  ms-* / me-*
 *   pl-* / pr-*                        →  ps-* / pe-*
 *   left-* / right-*                   →  start-* / end-*
 *   text-left / text-right             →  text-start / text-end
 *
 * Le legacy EXISTANT est toléré : seules les lignes AJOUTÉES du diff sont
 * scannées (une ligne inchangée n'est jamais re-flagée) — la migration se
 * fait incrémentalement. L'allowlist ci-dessous nomme les exceptions
 * justifiées (positionnement physique délibéré) avec leur raison.
 *
 * Usage (hook pre-commit, depuis la racine du repo) :
 *   node apps/frontend/scripts/guard-a4.mjs
 */

import { execSync } from 'node:child_process';

// Utilités physiques : ml/mr/pl/pr/left/right + valeur Tailwind
// (chiffres, auto, fractions, px, named, arbitraires [..]), ou text-left/right.
const PHYSICAL_RE = /\b(?:ml|mr|pl|pr|left|right)-[\w[\]/.-]+|\btext-(?:left|right)\b/;

// Exceptions documentées — positionnement physique délibéré, non-directionnel.
const A4_ALLOWED = new Map([
  [
    'apps/frontend/src/app/[locale]/page.tsx',
    'blobs décoratifs ancrés aux coins (position physique volontaire, non-directionnelle)',
  ],
]);

const DIFF = execSync(
  'git diff --cached --unified=0 -- apps/frontend/src',
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
);

const violations = [];
let currentFile = null;

for (const line of DIFF.split('\n')) {
  if (line.startsWith('+++ b/')) {
    currentFile = line.slice(6).trim();
    continue;
  }
  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  if (!currentFile) continue;

  const added = line.slice(1);
  const m = added.match(PHYSICAL_RE);
  if (m) {
    const reason = A4_ALLOWED.get(currentFile);
    if (!reason) {
      violations.push(
        `${currentFile}: +${added.trim().slice(0, 100)} — utilité directionnelle physique « ${m[0]} » interdite (logique : ms/me/ps/pe/start/end/text-start|end).`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(`✗ guard-a4 — ${violations.length} nouvelle(s) utilité(s) physique(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-a4 — aucune nouvelle utilité directionnelle physique');
