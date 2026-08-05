# Décisions techniques structurelles (Phases A, B, D)

> Registre au style `SPEC.md` de yuvomi : chaque entrée = contexte, problème,
> fix **structurel** (pas le patch), référence (issue yuvomi ou commit).
> Toute nouvelle décision structurelle s'ajoute ici, avec sa raison.

---

## 1. Arêtes dark indépendantes — jamais dérivées de la rampe (A2)

- **Contexte** : en dark, la rampe neutre est si proche de la surface que dériver `--color-border-subtle` de la rampe résolvait à **exactement** la couleur de la surface (1.00:1) — cartes, lignes et champs sans bordure visible.
- **Problème** : une formule de dérivation ne peut pas garantir un ratio minimum.
- **Fix structurel** : trois paliers d'arêtes en **hex fixes mesurés** contre la surface de travail dark `#232019` (1.42:1 / 1.77:1 / 2.99:1), jamais calculés ; chaque valeur porte son ratio en commentaire ; le guard A2 vérifie hex ≠ surface + présence du ratio.
- **Référence** : yuvomi v1.57.0 (« edges set independently ») · commit `29b29bf` (A2).

## 2. No-blur dans le conteneur scrollable (A3)

- **Contexte** : tout élément avec `backdrop-filter` **ou** `filter` dans un conteneur `overflow: auto` devient un layer GPU indépendant ; avec beaucoup de cartes, le compositor mobile sature → **écran blanc au scroll** sur iOS WebKit et Android Blink.
- **Problème** : l'effet glass est additif, chaque nouveau composant réintroduit le blur dans le flux de scroll.
- **Fix structurel** : règle unique `.app-scroll *, *::before, *::after { backdrop-filter: none !important; filter: none !important; }` — les overlays (Sheet, Dialog, Toaster) sont portalisés **hors** du conteneur et gardent leur blur ; les blobs décoratifs passent en dégradés radiaux (un filtre décoratif dans le scroll est une régression, pas une décoration) ; guard A3 interdit blur/filtres hors `components/ui/`.
- **Référence** : yuvomi **#166** · commits `c1b6aeb` (A3), `fbe7c86` (hardening `filter:`).

## 3. Focus ring tokenisé — pas de shorthand (A5)

- **Contexte** : six spécifications concurrentes de focus ring (reset, glass, ~45 règles composants) ; en tabulant, le ring alternait violet/orange — un changement de couleur lu comme un changement de contexte.
- **Problème** : un token combiné (`--focus-ring: 2px solid var(--ring)`) est inutilisable : les custom properties se résolvent là où elles sont **déclarées** — un shorthand sur `:root` gèlerait la couleur et rendrait les overrides locaux muets.
- **Fix structurel** : quatre tokens (`width/color/offset/offset-inset`), une règle de base `:focus-visible`, les exceptions justifiées ne surchargent **que** `--focus-ring-color` ; `prefers-contrast: more` **redéfinit les tokens** (une propriété sur `:focus-visible` (0,1,0) perdait contre chaque règle composant) ; seam shadcn `--ring: var(--focus-ring-color)`.
- **Référence** : yuvomi v1.60.0 · commit `6bd8cc1` (A5).

## 4. « Look first, edit second » — actions de footer en force (B1)

- **Contexte** : taper un rendez-vous ouvrait le formulaire → le clavier virtuel couvrait ~40 % de l'écran pour une simple lecture ; supprimer demandait « abandonner les modifications ? » pour des champs que la suppression emporte de toute façon.
- **Problème** : la confirmation d'abandon est posée sur des données qui n'existent plus après l'action.
- **Fix structurel** : vue lecture **sans aucun champ de saisie** (le clavier ne peut structurellement pas s'ouvrir — garanti par structure, pas par un autofocus retiré) ; « Modifier » monte le formulaire à ce moment-là, il **reste monté** au retour (« Retour », pas « Enregistrer ») ; les actions de footer ferment **en force**, sans dialogue d'abandon ; jeton d'ancienneté (viewSeq) : une réponse async tardive se jette si sa vue a été remplacée.
- **Référence** : yuvomi **#625** · commit `824e01b` (B1).

## 5. Rollover mensuel corrigé dans le moteur RRULE (B3)

- **Contexte** : `nextOccurrence` porté de yuvomi : `setUTCMonth(+1)` sur un 31 **roulait sur le mois suivant avant le clamp** (31 mars + 1 mois → 1er mai au lieu du 30 avril).
- **Problème** : bug latent de l'original yuvomi — le clamp s'appliquait après le rollover.
- **Fix structurel** : passage par le jour 1 avant le décalage (`setUTCDate(1)` → `setUTCMonth(+1)` → clamp au dernier jour), même garde pour YEARLY ; test dédié « 31 mars → 30 avril ».
- **Référence** : yuvomi `recurrence.js` (bug) · commit `3c6fcd5` (B3) · test `recurrence.test.ts`.

## 6. Préférences calendrier lues après hydratation (B4)

- **Contexte** : l'initialiseur paresseux du `useState` lisait `localStorage`/`matchMedia` — deux API **client-only** — pendant le rendu serveur du server component : le SSR rendait le défaut, l'hydratation lisait la préférence → **mismatch d'hydratation** pour tout visiteur avec une préférence stockée.
- **Problème** : le build vert ne détecte pas le warning runtime ; le lazy initializer s'exécute aussi côté serveur.
- **Fix structurel** : défaut serveur **stable** (`mois`), lecture de la préférence dans un `useEffect` post-montage (flag `mounted`) + placeholder de rendu identique SSR/client ; invariant `mounted` au guard B4.
- **Référence** : commit `4f3eec3` (B4 fix).

## 7. Recherche patients diacritic-insensitive + scoping médecin en SQL (B5)

- **Contexte** : la recherche Payload `contains` est accent-sensitive (« elodie » ne trouve pas « Élodie ») ; l'endpoint SQL brut contournerait le filtre d'accès des médecins (followedBy/sharedWith/orphelins).
- **Problème** : un accès données brut doit reproduire les règles d'accès de la collection, sinon c'est un trou.
- **Fix structurel** : `unaccent(full_name) ILIKE unaccent(%q%)` + index `gin (f_unaccent(full_name) gin_trgm_ops)` + `ORDER BY similarity(...) DESC` ; garde-fous serveur (q ≤ 60, wildcards `% _ \` neutralisés, LIMIT 10) ; le filtre médecin est **reproduit en SQL** via `patients_rels` (EXISTS followedBy/sharedWith + orphelins). Découvert par le test de preview : **PG 18 marque `unaccent` STABLE** → l'index d'expression direct est rejeté ; wrapper `public.f_unaccent` IMMUTABLE requis (migration + endpoint passent par lui). Limitation documentée : **les harakat arabes ne sont pas pliés** par unaccent — la recherche arabe reste exacte, la translittération latine ne matche pas l'arabe (vérifié en preview).
- **Référence** : commit `ad369d9` (B5) · fix preview `20260803_add_unaccent_search` (wrapper f_unaccent) · vérification `verify-unaccent.mjs`.

## 8. Ledger d'audit : dedupKey fenêtré à l'heure pour les lectures (D1)

- **Contexte** : tracer les accès sans inonder le registre ; un événement rejoué ne doit pas créer de doublon.
- **Problème** : une ligne par lecture brute = bruit ; une idempotence par (entity, entityId, action) seul empêcherait deux lectures légitimes successives.
- **Fix structurel** : clé `read:{actor}:{patient}:{YYYY-MM-DDTHH}` + **index unique partiel** `(entity, entity_id, action, dedup_key) WHERE dedup_key IS NOT NULL` — le doublon est le comportement nominal (silencieux, debug) ; toute autre panne d'écriture est warn, jamais bloquante pour l'opération médicale ; rectification = nouvelle ligne `reversed`, jamais de suppression.
- **Référence** : pattern Ledger yuvomi (reward_ledger, solde = SUM(delta)) · commits `a156e27`, `45ad5dc`.

## 9. Trace d'export actionnable (D1)

- **Contexte** : l'événement `exported` avec `patientId: null` traçait **qui** a exporté, pas **quoi** — difficile à défendre en audit (CNDP).
- **Problème** : un export bulk anonyme n'est pas une trace exploitable.
- **Fix structurel** : `detail { count, ids ≤ 500 }` validés par l'endpoint (`/audit-ledger/export-event`) et fournis par la route d'export — le périmètre exact de l'export est documenté dans la ligne.
- **Référence** : commit `45ad5dc`.

## 10. Data Cache Next pour les lectures authentifiées : TTL bornés + revalidation par écriture (Perf A+B)

- **Contexte** : le render serveur dominait le coût des switchs de vue (450-750 ms par RSC) : `authenticate()` appelait `/api/users/me` en `revalidate: 0` à chaque navigation (layout + page + routes), et `fetchCMS` défaillait aussi en non-cache — toutes les données authentifiées étaient re-fetchées fraîches à chaque render.
- **Problème** : un cache global naïf croiserait les comptes (même requête, sessions différentes) ; une invalidation imprécise servirait des données périmées.
- **Fix structurel** : **isolation par credentials dans la clé de cache** — `fetch` inclut le header `Authorization` dans les options, donc dans la clé du Data Cache Next (aucune entrée partagée entre tokens, prouvé par le test bi-compte) ; tags `auth:<hashFnv1a-du-token>` (jamais le token brut) pour le profil utilisateur, purgés au logout ; `authenticate()` enveloppé dans `cache()` React (dédup par requête : layout + page + route API = 1 seul users/me) ; lectures `fetchCMS` en TTL 30 s par défaut avec tags `col:<collection>` dérivés du chemin ; **toute écriture réussie revalide le tag de sa collection** (proxy CMS, bookings, annulation, export) — l'auteur voit sa donnée instantanément, les autres postes restent bornés par le TTL.
- **Trade-off accepté** : une révocation de rôle met jusqu'à 20 s à se propager (users/me en TTL) ; une donnée écrite depuis un autre poste met jusqu'à 30 s à apparaître (bornée par la revalidation à l'écriture locale et par le polling de file). Les mutations elles-mêmes ne passent jamais par le cache.
- **Référence** : yuvomi perf-session (Data Cache + tags) · commits du lot Perf A+B.
