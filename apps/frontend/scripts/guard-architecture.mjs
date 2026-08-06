#!/usr/bin/env node
/**
 * Guard Architecture (Phase D — D2) — point d'entrée unique, trois invariants :
 *
 *   1. LAYER-BOUNDARY : apps/frontend n'importe JAMAIS depuis apps/cms et
 *      réciproquement. Les utils réellement isomorphes passent par une
 *      allowlist explicite (vide aujourd'hui — la mécanique est en place,
 *      ajouter un util partagé = l'y déclarer, pas affaiblir la règle).
 *   2. PARITÉ i18n : messages/{en,ar,tzm}.json portent EXACTEMENT les mêmes
 *      clés (chemins complets) et les mêmes {{placeholders}} que la référence
 *      messages/fr.json — une locale qui traîne derrière casse le commit.
 *   3. BREAKPOINTS canoniques : @media (min|max-width) hors 640/768/1024/1440
 *      (+ compléments 639/767/1023/1439) interdits dans le CSS ; variantes
 *      Tailwind xl:/2xl: et arbitraires min-[…]/max-[…] interdites dans les
 *      TSX (le reflow composant passe par @container, pas par de nouvelles
 *      fenêtres de viewport).
 *
 * Usage : pnpm --filter frontend guard:architecture
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const REPO_DIR = path.resolve(FRONTEND_DIR, '..', '..');
const CMS_DIR = path.join(REPO_DIR, 'apps', 'cms');
const MESSAGES_DIR = path.join(FRONTEND_DIR, 'messages');

// Allowlist isomorphe (frontend ↔ cms) — vide : aucun util partagé pour
// l'instant. Un util vraiment isomorphe (pur, sans DOM/Node) s'y ajoute.
const ISOMORPHIC_ALLOWLIST = new Set([]);

const violations = [];

// ---------------------------------------------------------------
// 1. Layer-boundary
// ---------------------------------------------------------------

const SOURCE_EXT = /\.(ts|tsx|mts|cts|mjs|cjs)$/;

function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (SOURCE_EXT.test(name)) out.push(full);
  }
  return out;
}

function importSpecifiers(code) {
  const out = [];
  const re = /\b(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(code)) !== null) out.push(m[1] ?? m[2]);
  return out;
}

function layerOf(absPath) {
  const rel = path.relative(REPO_DIR, absPath);
  if (rel === 'apps/frontend' || rel.startsWith('apps/frontend' + path.sep)) return 'frontend';
  if (rel === 'apps/cms' || rel.startsWith('apps/cms' + path.sep)) return 'cms';
  return null;
}

const boundaryPairs = [
  { scan: path.join(FRONTEND_DIR, 'src'), forbiddenLayer: 'cms', label: 'apps/frontend → apps/cms' },
  { scan: path.join(CMS_DIR, 'src'), forbiddenLayer: 'frontend', label: 'apps/cms → apps/frontend' },
];

for (const { scan, forbiddenLayer, label } of boundaryPairs) {
  for (const file of sourceFiles(scan)) {
    const code = readFileSync(file, 'utf8');
    for (const spec of importSpecifiers(code)) {
      let target = null;
      if (spec.startsWith('.')) {
        target = path.resolve(path.dirname(file), spec);
      } else if (spec.includes('apps/cms') || spec.includes('apps/frontend')) {
        target = path.join(REPO_DIR, spec.replace(/^@\//, ''));
      }
      if (!target) continue;
      if (layerOf(target) === forbiddenLayer && !ISOMORPHIC_ALLOWLIST.has(spec)) {
        violations.push(
          `${path.relative(REPO_DIR, file)} — import ${label} interdit : '${spec}'` +
            (ISOMORPHIC_ALLOWLIST.size ? '' : ' (allowlist isomorphe vide)'),
        );
      }
    }
  }
}

// ---------------------------------------------------------------
// 2. Parité i18n (référence : fr)
// ---------------------------------------------------------------

function flatten(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') Object.assign(out, flatten(value, full));
    else out[full] = String(value);
  }
  return out;
}

function placeholdersOf(value) {
  return [...new Set([...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))].sort();
}

function loadLocale(file) {
  return JSON.parse(readFileSync(path.join(MESSAGES_DIR, file), 'utf8'));
}

const fr = flatten(loadLocale('fr.json'));
const others = ['en.json', 'ar.json', 'tzm.json'];
for (const file of others) {
  const locale = flatten(loadLocale(file));
  for (const key of Object.keys(fr)) {
    if (!(key in locale)) {
      violations.push(`i18n ${file} — clé manquante : ${key}`);
    } else {
      const fp = placeholdersOf(fr[key]);
      const lp = placeholdersOf(locale[key]);
      if (JSON.stringify(fp) !== JSON.stringify(lp)) {
        violations.push(`i18n ${file} — placeholders différents sur ${key} : fr [${fp}] vs [${lp}]`);
      }
    }
  }
  for (const key of Object.keys(locale)) {
    if (!(key in fr)) violations.push(`i18n ${file} — clé inconnue de la référence fr : ${key}`);
  }
}

// ---------------------------------------------------------------
// 3. Breakpoints canoniques
// ---------------------------------------------------------------

const ALLOWED_WIDTHS = new Set([639, 640, 767, 768, 1023, 1024, 1439, 1440]);

function walkCss(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkCss(full));
    else if (full.endsWith('.css')) out.push(full);
  }
  return out;
}

for (const file of walkCss(path.join(FRONTEND_DIR, 'src'))) {
  const css = readFileSync(file, 'utf8');
  for (const m of css.matchAll(/@media[^{]*\((min|max)-width:\s*(\d+)px\)/g)) {
    if (!ALLOWED_WIDTHS.has(Number(m[2]))) {
      const line = css.slice(0, m.index).split('\n').length;
      violations.push(`${path.relative(FRONTEND_DIR, file)}:${line} — breakpoint ${m[2]}px hors canonique 640/768/1024/1440`);
    }
  }
}

function walkTsx(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkTsx(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const VARIANT_RE = /(^|[:\s"'`(])(?:xl|2xl):|\bmin-\[|\bmax-\[/;
for (const file of walkTsx(path.join(FRONTEND_DIR, 'src'))) {
  const src = readFileSync(file, 'utf8');
  const m = src.match(VARIANT_RE);
  if (m) {
    const line = src.slice(0, m.index).split('\n').length;
    violations.push(
      `${path.relative(FRONTEND_DIR, file)}:${line} — variante hors canonique (${m[0].trim()}) : xl:/2xl:/min-[…]/max-[…] interdites`,
    );
  }
}

// ---------------------------------------------------------------

if (violations.length > 0) {
  console.error(`✗ guard-architecture — ${violations.length} violation(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-architecture — layer-boundary, parité i18n, breakpoints canoniques OK');
