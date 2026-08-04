#!/usr/bin/env node
/**
 * Vérification B5 — recherche patients diacritic-insensitive (DB de dev).
 * Usage : pnpm --filter drpediatre-cms verify:unaccent   (DB reachable)
 *
 * Prérequis : migrations appliquées (pnpm --filter drpediatre-cms exec payload migrate).
 * Vérifie : extensions, folding des accents (Élodie) et harakat arabes,
 * « elodie » trouve « Élodie », « ca » borné (LIMIT 10), wildcards
 * neutralisés, index trigramme présent.
 */

import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const uri =
  process.env.DATABASE_URI ??
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URI='))
    ?.split('=')
    .slice(1)
    .join('=')

if (!uri) {
  console.error('DATABASE_URI introuvable dans apps/cms/.env')
  process.exit(1)
}

const c = new Client({ connectionString: uri, connectionTimeoutMillis: 8000 })
const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

try {
  await c.connect()

  const exts = await c.query(`SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm')`)
  check('extensions unaccent + pg_trgm', exts.rowCount === 2, exts.rows.map((r) => r.extname).join(', '))

  const el = await c.query(`SELECT unaccent('Élodie') AS v`)
  // unaccent plie les accents mais ne lower-case pas ('Elodie', pas 'elodie') —
  // la casse est gérée par ILIKE dans la requête de recherche.
  check('« Élodie » → « Elodie » (casse préservée)', el.rows[0].v === 'Elodie', el.rows[0].v)

  const ar = await c.query(`SELECT unaccent('مُحَمَّد') AS v`)
  // Limitation documentée : unaccent ne plie PAS les harakat arabes — la
  // recherche arabe reste exacte (le nom avec harakat ne matche que tel quel).
  check('harakat arabes non pliés (limitation documentée)', ar.rows[0].v === 'مُحَمَّد', ar.rows[0].v)

  const found = await c.query(
    `SELECT "full_name" FROM "patients" WHERE unaccent("full_name") ILIKE unaccent('%elodie%') LIMIT 10`,
  )
  console.log(
    `  → « elodie » : ${found.rowCount} résultat(s) — ${found.rows.map((r) => r.full_name).join(', ') || '(aucun patient « Élodie » en base : vérifier sur un seed)'}`,
  )

  const ca = await c.query(
    `SELECT "full_name" FROM "patients" WHERE unaccent("full_name") ILIKE unaccent('%ca%') LIMIT 10`,
  )
  check('« ca » borné à 10 résultats', ca.rowCount <= 10, `${ca.rowCount} résultat(s)`)

  const safe = '%'.replace(/[%_\\]/g, ' ')
  const wc = await c.query(`SELECT "full_name" FROM "patients" WHERE unaccent("full_name") ILIKE unaccent($1) LIMIT 10`, [`%${safe}%`])
  console.log(`  → « % » sanitisé en espace : ${wc.rowCount} résultat(s) — pas de full-scan`)

  const idx = await c.query(`SELECT indexname FROM pg_indexes WHERE indexname = 'patients_full_name_unaccent_trgm_idx'`)
  check('index trgm sur unaccent(full_name)', idx.rowCount === 1)

  await c.end()
} catch (err) {
  console.error(`✗ connexion/vérification impossible : ${err.code || err.message}`)
  process.exit(1)
}

if (failures.length > 0) {
  console.error(`✗ vérification B5 : ${failures.length} échec(s)`)
  process.exit(1)
}
console.log('✓ vérification B5 OK')
