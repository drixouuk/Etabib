# Phase D — Plan d'exécution (Audit & Guards)

> Référence : `yuvomi-analysis.md` §8 Phase D (D1-D4). Branche : `feature/phase-d-audit-guards` (créée depuis `feature/phase-b-agenda-patient` ; Phases A/B terminées non mergées, C différée — aucun commit sur `main`).
> Stack : Payload CMS v3 + PostgreSQL (apps/cms), Next.js 16 (apps/frontend). Guards existants (`guard-design`, `guard-a4`, `guard-phase-b`) inchangés.

## Ordre d'implémentation

```
D1 ──► D2 ──► D3        (D4 optionnel, scindable, en dernier)
```

| Item | Dépend de | Raison |
|---|---|---|
| D1 Registre d'audit immuable | — | Modèle de données + hooks (Payload) |
| D2 Guards statiques manquants | — | Point d'entrée unique, sans dépendance |
| D3 Décisions techniques documentées | — | Documente A/B (rétroactif) |
| D4 Offline read-only (PWA) | — | **Optionnel** : à planifier seul, marqué hors scope si la phase doit se clore |

---

## D1 — Registre d'audit médical (ledger immuable)

- **Créer** `apps/cms/src/collections/AuditLedger.ts` → slug `audit-ledger`, **create-only** : `access.create` authentifié, `access.read` par tenant (superadmin/titulaire), **pas** d'`update` ni `delete` (retournent false) ; `hooks` `beforeChange` verrouillent `actor`/`tenant`/`occurredAt` (readOnly + re-affectés serveur, jamais pris du body)
- **Champs** : `patient` (relationship → patients, indexée), `actor` (relationship → users), `tenant` (relationship, readOnly), `action` (text : `created`/`updated`/`read`/`exported`/`reversed`), `entity` (text : `consultation`/`prescription`/`document`…), `entityId` (text), `detail` (json — snapshot avant/après), `dedupKey` (text, nullable — idempotence des événements rejouables), `occurredAt` (date)

```ts
// AuditLedger.ts — immuable par construction
access: {
  create: ({ req }) => !!req.user,
  read: ({ req }) => /* scoping tenant */,
  update: () => false,
  delete: () => false,
},
```

- **Idempotence** : migration SQL — index unique partiel `ON audit_ledger (entity, entity_id, action, dedup_key) WHERE dedup_key IS NOT NULL` (un événement rejoué ne crée pas de doublon)
- **Rectification** : jamais de suppression — une correction est une nouvelle ligne `action: 'reversed'` + `detail.reversalOf = <id d'origine>`
- **Créer** `apps/cms/src/hooks/auditLedger.ts` → `ledgerWrite(payload, req, { patient, action, entity, entityId, detail, dedupKey })` via `payload.create` (échec non bloquant, loggé — le soin ne doit jamais dépendre de l'audit)
- **Brancher** : `Consultations.ts` et `Prescriptions.ts` → `afterChange` (created/updated avec snapshot avant/après) ; `Patients.ts` → l'`afterRead` existant (`logPatientAccess`) écrit aussi une ligne ledger `action: 'read'` pour les lectures sensibles ; l'export PDF/dossier → `action: 'exported'` (point d'appel dans la route d'export)
- **Migration Payload** : nouvelle collection + index partiel + `migrations/index.ts` (convention repo)
- **Guard** (étendre `guard-phase-b.mjs` ? Non — nouveau `apps/cms/scripts/guard-audit.mjs` branché au pre-commit) : collection `AuditLedger.ts` sans `update`/`delete` access ; `payload.create` seul utilisé dans `hooks/auditLedger.ts` (pas d'`update` sur `audit-ledger` ailleurs dans `apps/cms/src`)

## D2 — Guards statiques manquants (point d'entrée unique)

- **Créer** `apps/frontend/scripts/guard-architecture.mjs` (exécute les 3 invariants ci-dessous ; un seul point d'entrée, branché au pre-commit à côté des guards existants)

### D2a — Layer-boundary
- Scan des imports de `apps/frontend/src` et `apps/cms/src` : aucun import relatif traversant vers l'autre app (`../../cms/…`, `../../frontend/…`) ; allowlist isomorphe explicite (vide aujourd'hui — mécanisme en place pour les futurs utils partagés, style `test-layer-boundary` yuvomi)
- **Guard** : regex sur les specifiers relatifs + `import.meta.url`-free ; violation → exit 1

### D2b — Parité i18n
- `apps/frontend/messages/{en,ar,tzm}.json` doivent avoir **exactement** les mêmes clés (chemin complet) et les mêmes `{{placeholders}}` que la référence `fr.json`
- **Guard** : walk récursif des 4 JSON (JSON.parse), diff de clés + extraction `/\{\{(\w+)\}\}/g` par valeur, erreurs listées clé par clé

### D2c — Breakpoints canoniques
- Seuls `640 / 768 / 1024 / 1440` (+ compléments) sont autorisés : scan des `@media (min|max-width: Npx)` dans `src/**/*.css`, et des variantes Tailwind dans `src/**/*.tsx` — `sm:`/`md:`/`lg:` OK, **`xl:`/`2xl:`/`min-[`/`max-[` interdits** (reflow composant → `@container`)
- **Guard** : regex `(min|max)-width:\s*(\d+)px` + `\b(?:xl|2xl):` + `(?:min|max)-\[` ; nombres hors {639,640,767,768,1023,1024,1439,1440} → violation

## D3 — Décisions techniques documentées (style SPEC.md)

- **Créer** `docs/DECISIONS.md` → une section par décision structurelle des Phases A/B, avec raison + référence yuvomi :
  - A2 bordures dark indépendantes (jamais dérivées de la rampe — 1.00:1, v1.57.0)
  - A3 no-blur dans le scroll container (`backdrop-filter`/`filter` = layers GPU, **#166**)
  - A5 focus ring tokenisé (pas de shorthand — résolution au scope)
  - B1 « look first, edit second » (actions de footer en force — **#625**)
  - B3 clamp mensuel (bug latent de l'original yuvomi, corrigé + testé)
  - B4 lecture des préférences après hydratation (mismatch SSR — flag `mounted`)
  - B5 `unaccent` + `pg_trgm` (recherche diacritic-insensitive, harakat inclus)
- **Guard** : aucun (documentation) — checklist de complétude dans le commit

## D4 — Offline read-only (PWA) — OPTIONNEL, scindable

- **Modifier** `apps/frontend/public/sw.js` (existe, réseau-d'abord statique, `/api/` et `/dashboard/` exclus) :
  - cache **réseau-d'abord** d'une allowlist de GET read-only : agenda (`/api/cms-proxy/calbookings`), disponibilités (`/api/cms-proxy/availability-slots`), patients (`/api/cms-proxy/patients/search`), horaires — données consultables hors-ligne avec bannière « Hors-ligne — données du {heure} » (`x-cached-at`)
  - **purge au logout** : message `CLEAR_API_CACHE` depuis la route logout → `caches.delete('etabib-api-…')` (un second utilisateur ne voit pas les données du précédent)
  - **version par build** : `CACHE_NAME` incluant le `buildId` Next (`etabib-<buildId>`) — purge des anciennes versions à l'activation ; jamais de page à cheval sur deux versions
- **Guard** : invariants SW dans `guard-architecture.mjs` (allowlist API présente, purge au logout référencée, version par buildId)
- **Décision** : si la phase doit se clore sans risque, D4 est **différé** en phase propre (PWA complète : install prompt, offline.html, coverage)

---

## Ordre de commit (1 commit / item, style conventionnel)

1. `feat(audit): add immutable medical audit ledger with idempotent hooks (D1)`
2. `test(guards): add layer-boundary, i18n parity and canonical breakpoints guards (D2)`
3. `docs: record structural decisions from phases A-B (D3)`
4. `feat(pwa): offline read-only cache for agenda and patients (D4)` — **optionnel**

Règles : jamais de commit sur `main` ; chaque commit poussé sur `feature/phase-d-audit-guards` ; builds verts (`apps/frontend` + `apps/cms`) + guards ; les guards de D2 naissent complets dans leur commit (point d'entrée unique `guard-architecture.mjs` branché au pre-commit).
