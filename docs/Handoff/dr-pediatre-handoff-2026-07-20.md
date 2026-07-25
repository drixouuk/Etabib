# Handoff — dr-pediatre (20 juillet 2026)

## État actuel

Projet sur **main** (`c88522f`), arbre propre. Pnpm monorepo avec `apps/cms` (Payload CMS v3 + Next.js 16) et `apps/frontend` (Next.js 16 + next-intl + Tailwind v4). Déployé sur Coolify (LXC unique à `192.168.1.161`, 2 containers Docker : un pour le CMS admin, un pour le frontend vitrine/dashboard).

## Ce qui a été fait (15 derniers commits)

### CMS — Collections dossier médical

- 3 collections créées : `Consultations`, `Prescriptions`, `Documents` (avec upload propre, distinct du Media public)
- `Patients.healthIdentifier` ajouté (champ préparatoire CNSS/DMP)
- Migration incrémentale manuelle (la génération auto produisait un dump complet qui cassait)
- RBAC restrictif (doctor/tenant_admin/superadmin seulement) sur toutes les collections cliniques
- Correction du crash superadmin (null tenant → accès à `.id`) sur les règles `update`/`delete`
- Correction du crash admin Payload lié aux colonnes manquantes `payload_locked_documents_rels`
- Correction de `Tenants.read` qui utilisait `tenantAccess` (filtrait par champ `tenant` inexistant sur `Tenants`)
- `SystemAlerts` collection créée pour capter les échecs d'audit-log

### CMS — Sécurité

- `Users.create` règle : vérifie que le tenant du nouvel utilisateur correspond à celui du créateur (empêche création cross-tenant)
- `beforeChange` hook sur Users : bloque l'attribution des rôles superadmin/tenant_admin par un non-admin
- Fallbacks de secrets (`PAYLOAD_SECRET`, `ADMIN_PASSWORD`, `SEED_SUPERADMIN_PASSWORD`, `SEED_DOCTOR_PASSWORD`) remplacés par des `throw` explicites
- `.env.example` nettoyé des vrais secrets, remplacés par `XXXXX`
- `pre-commit` hook husky renforcé (vérifie migration + secrets dans .env.example)

### Frontend — Dashboard

- Routes dashboard déplacées sous `/dashboard/` (conflit résolu entre vitrine et dashboard sur `/[locale]`)
- Login déplacé sous `[locale]/login/` (localePrefix 'always' cassait la route)
- Proxy middleware : API routes exclues de la redirection i18n (POST `/api/auth/login` redirigé vers `/fr/api/auth/login` → 404)
- Cache tenant borné (LRU 200 entrées, TTL 10 min) au lieu de Map infini
- Widget file d'attente en direct avec transitions d'état (waiting → in_consultation → completed)
- Bouton "Ajouter à la file d'attente" sur fiche patient
- Checkbox "Ajouter à la file" dans le formulaire nouveau patient
- Sections UI Consultations / Prescriptions / Documents sur fiche patient (CRUD via proxy)
- Proxy multipart : détection Content-Type pour forwarder les uploads FormData en stream
- Page system-alerts (superadmin seulement), lien dans nav dashboard
- Pages de secours : error.tsx, not-found.tsx, loading.tsx (brandées)
- Sitemap, robots, canonical URL dynamiques par tenant (via headers Host)
- JSON-LD MedicalOrganization dynamique dans `<head>` (name, city, geo, phone, specialty)

### Frontend — Vitrine publique

- Texte CMS Lexical rendu via `@payloadcms/richtext-lexical` (RichText + prose)
- Footer : lien "Espace praticien" vers /login
- Boutons Hero harmonisés (h-12)
- "En savoir plus" scroll vers #presentation
- Header CTA Rendez-vous link vers #rdv (scroll même après 1er clic)
- Horaires : jour par jour (payload range → expand → map → locale-aware)

## Problèmes connus / À faire

1. **Vérifier que le frontend fonctionne sur le LXC après redéploiement** — le dernier déploiement a résolu le login, mais il faut vérifier que tout roule (dashboard, patients, file d'attente, upload de documents).
2. **Image orientation.png** — l'URL `/api/media/file/orientation.png` était fausse ; changée en `/media/orientation.png` dans InfosSection. Vérifier que l'image s'affiche.
3. **Vérifier que les nouveaux mots de passe sont bien en place** (PAYLOAD_SECRET, mot de passe Postgres) sur Coolify après le fix du 19 juillet.
4. **Aucun endpoint frontend pour `consultations/prescriptions/documents` n'a été testé en conditions réelles** — les formulaires existent sur la fiche patient mais il faut les tester avec un upload de PDF, création d'ordonnance multi-médicaments, etc.
5. **La description des services** utilise RichText (`@payloadcms/richtext-lexical`) mais ServicesSection est un serveur component — vérifier que le rendu est correct sur la vitrine.
6. **Les tokens Cal.com sont exposés via Tenants.read** — maintenant restreint, mais vérifier que le frontend arrive toujours à résoudre le tenant pour le booking.
7. **Le mot de passe Postgres a dû être synchronisé manuellement avec `ALTER USER`** après le changement dans Coolify (Postgres n'utilise `POSTGRES_PASSWORD` qu'à l'initialisation).

## Notes infra

- **LXC** : `192.168.1.161` — SSH via `ssh -i ~/.ssh/id_edd25519 root@192.168.1.161`
- **Containers** : CMS admin (`n92jeln2oa3p5i4erc2cuibi-*`), frontend (`y120xmp5yr42bk1qffl5xvs1-*`), Postgres (`f13slj6e869gsmg044jju73h`), Cal.com, Traefik, Coolify, Garage (S3)
- **DB** : DB name `cms-db`, user `postgres`. Le mot de passe Coolify a été changé. La base a `POSTGRES_DB=template1` (Coolify default), mais la vraie DB est `cms-db`.
- **SSH sans demande** : l'utilisateur a demandé de ne PAS utiliser cette connexion sans lui demander explicitement.

## Références

- `docs/PRD.md` — Product Requirements
- `design-system/MASTER.md` — Design tokens, palette, typo, conventions
- `AGENTS.md` — Stack, workflow agents, locales, infra
- `docs/dossier-medical-spec.md` — Spec détaillée des 3 collections dossier médical
- `docs/Roadmap amo fse dmp.md` — Roadmap AMO/FSE/DMP
- `docs/Feuille de route.md` — feuille de route du travail à réaliser
- Voir les commits récents pour le détail : `git log --oneline -30`

## Suggested skills

- **frontend-design** — si le prochain chantier touche à l'UI (formulaires, sections dashboard, animations)
- **webapp-testing** — pour tester le rendu vitrine, les soumissions de formulaires, l'upload de documents
