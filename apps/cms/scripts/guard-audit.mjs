#!/usr/bin/env node
/**
 * Guard D1 — registre d'audit médical immuable.
 *
 *   G1. AuditLedger.ts est create-only : access.update et access.delete
 *       renvoient false ; actor/tenant/occurredAt verrouillés par beforeChange
 *       (valeurs serveur uniquement).
 *   G2. hooks/auditLedger.ts écrit via payload.create dans un try/catch
 *       (non bloquant — le soin ne dépend jamais de l'audit).
 *   G3. Consultations.ts / Prescriptions.ts branchent ledgerAfterChange ;
 *       Patients.ts branche ledgerRead (lecture fenêtrée).
 *   G4. La migration 20260803_add_audit_ledger.ts porte l'index unique
 *       partiel WHERE "dedup_key" IS NOT NULL.
 *
 * Usage (hook pre-commit, depuis la racine du repo) :
 *   node apps/cms/scripts/guard-audit.mjs
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CMS_DIR = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(path.join(CMS_DIR, ...rel.split('/')), 'utf8');

const violations = [];

// G1 — create-only + verrouillage serveur
const ledger = read('src/collections/AuditLedger.ts');
if (!/update:\s*\(\).*false/.test(ledger) || !/delete:\s*\(\).*false/.test(ledger)) {
  violations.push('AuditLedger.ts — access.update/delete doivent renvoyer false (create-only) (D1)');
}
for (const field of ['data.actor = req.user?.id', 'data.tenant =', 'data.occurredAt = new Date()']) {
  if (!ledger.includes(field)) {
    violations.push(`AuditLedger.ts — verrouillage serveur manquant : ${field} (D1)`);
  }
}

// G2 — écriture non bloquante via payload.create
const hook = read('src/hooks/auditLedger.ts');
if (!hook.includes("collection: 'audit-ledger'") || !hook.includes('payload.create') || !hook.includes('try {')) {
  violations.push('hooks/auditLedger.ts — payload.create en try/catch manquant (D1)');
}

// G3 — branchements
for (const [file, marker] of [
  ['src/collections/Consultations.ts', 'ledgerAfterChange('],
  ['src/collections/Prescriptions.ts', 'ledgerAfterChange('],
  ['src/collections/Patients.ts', 'ledgerRead('],
]) {
  if (!read(file).includes(marker)) {
    violations.push(`${file} — branchement ledger manquant (${marker}) (D1)`);
  }
}

// G4 — index unique partiel en migration
const migration = read('src/migrations/20260803_add_audit_ledger.ts');
if (!migration.includes('CREATE UNIQUE INDEX') || !migration.includes('WHERE "dedup_key" IS NOT NULL')) {
  violations.push('migration 20260803_add_audit_ledger.ts — index unique partiel (dedup_key) manquant (D1)');
}

if (violations.length > 0) {
  console.error(`✗ guard-audit — ${violations.length} violation(s) :`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('✓ guard-audit — invariants D1 respectés');
