#!/usr/bin/env node
/**
 * Guard Design System — invariants Phase A (A1).
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
 *   G3. tokens.css est bien importé par globals.css (sinon les tokens
 *       n'existent qu'à moitié).
 *
 * Usage : pnpm --filter frontend guard:design
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const STYLES_DIR = path.join(FRONTEND_DIR, 'src', 'styles');
const GLOBALS_CSS = path.join(FRONTEND_DIR, 'src', 'app', 'globals.css');

// Arêtes autorisées à être assignées en littéral, UNIQUEMENT en contexte dark.
const EDGE_EXCEPTION = new Set([
  '--color-border',
  '--color-border-subtle',
  '--color-border-strong',
  '--glass-border-subtle',
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

/** Parcourt un CSS : pour chaque déclaration, rend {name, value, line, prelude, mediaStack}. */
function walkDeclarations(css) {
  const out = [];
  const stack = []; // { prelude, media } — règles englobantes
  let i = 0;
  let line = 1;
  const n = css.length;

  const countLines = (text) => (text.match(/\n/g) ?? []).length;

  while (i < n) {
    const nextBrace = css.indexOf('{', i);
    const nextSemi = css.indexOf(';', i);
    const nextClose = css.indexOf('}', i);
    if (nextBrace === -1) break;

    if (nextClose !== -1 && (nextClose < nextBrace || (nextSemi !== -1 && nextSemi < nextBrace && nextSemi < nextClose))) {
      // fin de règle
      const closeEnd = css.indexOf('}', i);
      if (nextSemi !== -1 && nextSemi < closeEnd) {
        // déclaration orpheline dans la règle courante
        const declText = css.slice(i, nextSemi);
        const m = declText.match(/(--[\w-]+)\s*:\s*([^;]*)/);
        if (m) {
          const top = stack[stack.length - 1];
          out.push({
            name: m[1],
            value: m[2].trim(),
            line,
            prelude: top?.prelude ?? '',
            mediaStack: stack.filter((s) => s.media).map((s) => s.media),
          });
        }
        line += countLines(declText);
        i = nextSemi + 1;
        continue;
      }
      line += countLines(css.slice(i, closeEnd + 1));
      i = closeEnd + 1;
      stack.pop();
      continue;
    }

    // début de règle
    const prelude = css.slice(i, nextBrace);
    const mediaMatch = prelude.match(/@media\s*([^{]+)/);
    const isMedia = !!mediaMatch;
    stack.push({
      prelude: prelude.trim(),
      media: isMedia ? mediaMatch[1].trim() : null,
    });
    line += countLines(css.slice(i, nextBrace + 1));
    i = nextBrace + 1;
  }
  return out;
}

function readStylesheets() {
  return readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith('.css'))
    .map((f) => {
      const full = path.join(STYLES_DIR, f);
      const css = readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      return { file: path.relative(FRONTEND_DIR, full), css, decls: walkDeclarations(css) };
    });
}

const violations = [];

for (const { file, css, decls } of readStylesheets()) {
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
  }
}

// G3 — branchement de tokens.css
const globals = readFileSync(GLOBALS_CSS, 'utf8');
if (!/@import\s+['"]\.\.\/styles\/tokens\.css['"]/.test(globals)) {
  violations.push('src/app/globals.css — @import ../styles/tokens.css manquant');
}

if (violations.length > 0) {
  console.error(`✗ guard-design — ${violations.length} violation(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-design — invariants A1 respectés');
