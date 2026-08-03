#!/usr/bin/env node
/**
 * Guard Design System — invariants Phase A (A1 + A2 + A3).
 *
 * Scan de apps/frontend/src/styles/*.css :
 *
 *   G1. Tokens privés (--_x) assignés UNIQUEMENT dans :root ou un bloc dark
 *       (.dark, [data-theme=…], @media (prefers-color-scheme: dark)).
 *   G2. Tokens publics (--color-*, --module-*, --glass-*, --focus-*) jamais
 *       assignés à une valeur littérale — indirection var() uniquement.
 *       EXCEPTION documentée : les arêtes (--color-border[-subtle|-strong],
 *       --glass-border-subtle) peuvent recevoir un hex en contexte dark —
 *       décision « bordures indépendantes » (item A2, cf. yuvomi v1.57.0).
 *   A2. Arêtes dark — pour chaque palier (--_color-border-subtle, --border,
 *       --_color-border-strong et leurs alias publics) en contexte dark :
 *       (a) hex fixe à 6 chiffres, (b) hex ≠ hex des surfaces dark du fichier
 *       (jamais 1.00:1), (c) commentaire de ratio « N.NN:1 » sur la même ligne.
 *   A3. Discipline no-blur : aucun backdrop-blur (classe Tailwind) ni
 *       backdrop-filter (CSS) hors de src/components/ui/ (overlays) — les
 *       exceptions sont nommées avec leur raison, cf. pattern yuvomi.
 *   G3. tokens.css est bien importé par globals.css (sinon les tokens
 *       n'existent qu'à moitié).
 *
 * Le parseur est un scanner caractère par caractère (commentaires /* *\/ sautés)
 * : il traite aussi les déclarations du DERNIER bloc d'un fichier — un parseur
 * indexOf("brace suivante") les ignorait silencieusement (faux positif A2).
 *
 * Usage : pnpm --filter frontend guard:design
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const STYLES_DIR = path.join(FRONTEND_DIR, 'src', 'styles');
const COMPONENTS_DIR = path.join(FRONTEND_DIR, 'src', 'components');
const APP_DIR = path.join(FRONTEND_DIR, 'src', 'app');
const GLOBALS_CSS = path.join(FRONTEND_DIR, 'src', 'app', 'globals.css');

// Arêtes autorisées à être assignées en littéral, UNIQUEMENT en contexte dark.
const EDGE_EXCEPTION = new Set([
  '--color-border',
  '--color-border-subtle',
  '--color-border-strong',
  '--glass-border-subtle',
]);

// Les 3 paliers d'arêtes + alias publics (A2).
const BORDER_STEPS = new Set([
  '--_color-border-subtle',
  '--_color-border',
  '--_color-border-strong',
  '--color-border-subtle',
  '--color-border',
  '--color-border-strong',
  '--border',
]);

// Surfaces dark dont les arêtes doivent se distinguer.
const DARK_SURFACE_TOKENS = new Set(['--_color-surface', '--_color-surface-work']);

const RATIO_COMMENT = /\/\*[^*]*\d+\.\d{2}:1/;

// A3 — blur : classes Tailwind backdrop-blur-* ou CSS backdrop-filter.
const BLUR_RE = /backdrop-blur(?:-[a-z\d]+|\[[^\]]+\])?|backdrop-filter/;

// Exceptions A3 nommées avec leur raison — toutes hors du flux de scroll
// (.app-scroll) : elles gardent le blur, comme la nav yuvomi.
const A3_EXCEPTIONS = new Map([
  ['src/components/layout/Header.tsx', 'nav fixe (hors flux de scroll)'],
  ['src/components/layout/LandingHeader.tsx', 'nav fixe (hors flux de scroll)'],
  ['src/components/dashboard/DashboardShell.tsx', 'scrim overlay de la sidebar mobile'],
]);

// Contexte dark : sélecteur .dark / [data-theme] ou media prefers-color-scheme: dark.
function isDarkContext(prelude, mediaStack) {
  return (
    /\.dark\b/.test(prelude) ||
    /\[data-theme/.test(prelude) ||
    mediaStack.some((m) => /prefers-color-scheme:\s*dark/i.test(m))
  );
}

function isRootContext(prelude) {
  return /^:root\b/.test(prelude.trim());
}

/**
 * Parcourt un CSS BRUT : pour chaque déclaration, rend
 * { name, value, line, prelude, mediaStack, lineRest } où lineRest est le texte
 * après le « ; » jusqu'à la fin de ligne (les commentaires de ratio y vivent).
 */
function walkDeclarations(css) {
  const out = [];
  const stack = []; // { prelude, media } — règles englobantes
  let ruleStart = 0; // début du préambule de la règle courante
  let declStart = 0; // début de la déclaration courante
  let line = 1;
  let i = 0;
  const n = css.length;

  const cleanPrelude = (p) => p.replace(/\/\*[\s\S]*?\*\//g, '').trim();

  while (i < n) {
    const ch = css[i];

    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2; // commentaire sauté (contenu quelconque)
      continue;
    }
    if (ch === '\n') {
      line++;
    } else if (ch === '{') {
      const prelude = cleanPrelude(css.slice(ruleStart, i));
      const mediaMatch = prelude.match(/@media\s*([^{]+)/);
      stack.push({ prelude, media: mediaMatch ? mediaMatch[1].trim() : null });
      ruleStart = i + 1;
      declStart = i + 1;
    } else if (ch === ';') {
      const top = stack[stack.length - 1];
      const m = css.slice(declStart, i).match(/(--[\w-]+)\s*:\s*([^;]*)/);
      if (m && top) {
        const newlineIdx = css.indexOf('\n', i + 1);
        out.push({
          name: m[1],
          value: m[2].trim(),
          line,
          prelude: top.prelude,
          mediaStack: stack.filter((s) => s.media).map((s) => s.media),
          lineRest: newlineIdx === -1 ? '' : css.slice(i + 1, newlineIdx),
        });
      }
      declStart = i + 1;
    } else if (ch === '}') {
      stack.pop();
      ruleStart = i + 1;
      declStart = i + 1;
    }
    i++;
  }
  return out;
}

function readStylesheets() {
  return readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith('.css'))
    .map((f) => {
      const full = path.join(STYLES_DIR, f);
      const css = readFileSync(full, 'utf8');
      return { file: path.relative(FRONTEND_DIR, full), decls: walkDeclarations(css) };
    });
}

const violations = [];

for (const { file, decls } of readStylesheets()) {
  // Surfaces dark du fichier (collecte avant les vérifications A2).
  const darkSurfaces = new Set(
    decls
      .filter((d) => DARK_SURFACE_TOKENS.has(d.name) && isDarkContext(d.prelude, d.mediaStack))
      .map((d) => d.value.toLowerCase())
      .filter((v) => /^#[0-9a-f]{6}$/.test(v)),
  );

  for (const d of decls) {
    const dark = isDarkContext(d.prelude, d.mediaStack);
    const root = isRootContext(d.prelude);

    // G1 — privés hors contexte autorisé
    if (d.name.startsWith('--_') && !root && !dark) {
      violations.push(
        `${file}:${d.line} — token privé ${d.name} assigné hors :root/bloc dark`,
      );
      continue;
    }

    // G2 — publics en littéral (hors exception arêtes en dark)
    if (
      /^--(color|module|glass|focus)-/.test(d.name) &&
      !d.value.includes('var(') &&
      !(EDGE_EXCEPTION.has(d.name) && dark)
    ) {
      violations.push(
        `${file}:${d.line} — token public ${d.name} assigné à une valeur littérale (indirection var() requise)`,
      );
    }

    // A2 — paliers d'arêtes en contexte dark
    if (dark && BORDER_STEPS.has(d.name)) {
      if (!/^#[0-9a-fA-F]{6}$/.test(d.value)) {
        violations.push(
          `${file}:${d.line} — arête dark ${d.name} doit être un hex fixe à 6 chiffres (${d.value})`,
        );
      } else if (darkSurfaces.has(d.value.toLowerCase())) {
        violations.push(
          `${file}:${d.line} — arête dark ${d.name} égale à la surface (ratio 1.00:1 interdit)`,
        );
      }
      if (!RATIO_COMMENT.test(d.lineRest)) {
        violations.push(
          `${file}:${d.line} — arête dark ${d.name} sans commentaire de ratio (/* N.NN:1 */) sur la même ligne`,
        );
      }
    }
  }
}

// G3 — branchement de tokens.css
const globals = readFileSync(GLOBALS_CSS, 'utf8');
if (!/@import\s+['"]\.\.\/styles\/tokens\.css['"]/.test(globals)) {
  violations.push('src/app/globals.css — @import ../styles/tokens.css manquant');
}

// A3 — scan du blur hors overlays (src/components/ui/)
function sourceFiles(dir, prefix) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full, prefix));
    else if (/\.(ts|tsx)$/.test(name)) out.push({ full, rel: path.relative(FRONTEND_DIR, full).split(path.sep).join('/') });
  }
  return out;
}

const uiDir = path.join(COMPONENTS_DIR, 'ui');
const scanned = [
  ...sourceFiles(COMPONENTS_DIR).filter((f) => !f.rel.startsWith('src/components/ui/')),
  ...sourceFiles(APP_DIR),
];
for (const { full, rel } of scanned) {
  const src = readFileSync(full, 'utf8');
  if (BLUR_RE.test(src)) {
    const reason = A3_EXCEPTIONS.get(rel);
    if (!reason) {
      violations.push(
        `${rel} — backdrop-blur / backdrop-filter hors de src/components/ui/ (overlays). `
        + `Ajouter la classe app-scroll ou déplacer l'effet dans un overlay ui/.`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(`✗ guard-design — ${violations.length} violation(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-design — invariants A1 + A2 + A3 respectés');
