# Phase A — Plan d'exécution (Design System)

> Référence : `yuvomi-analysis.md` §8 (items A1-A6). Branche : `feature/phase-a-design-system`.
> Stack : Next.js 16 + Tailwind v4 + shadcn + next-intl. Aucun item n'est indépendant de A1.

## Ordre d'implémentation

```
A1 ──► A2 ──► A3 ──► A5 ──► A6 ──► A4
```

| Item | Dépend de | Raison |
|---|---|---|
| A1 Tokens privé/public + rôles de surface | — | Base de tout : A2 (dark), A3 (rôles), A5/A6 (tokens lus) |
| A2 Bordures dark indépendantes | A1 | Réécrit les `--_x` privés du bloc dark |
| A3 No-backdrop-filter dans le scroll | A1 | S'appuie sur les rôles `work`/`glass` |
| A5 Focus ring tokenisé | A1 | Lit `--focus-ring-*` + fallback `--color-accent-brand` (fonctionne avant A6) |
| A6 Accents par module + formule tint | A1 | Pose `--active-module-accent` que A5 consomme ensuite |
| A4 Bootstrap lang/dir | — | Indépendant (i18n) ; placé en fin pour ne pas bloquer le reste |

---

## A1 — Tokens privé/public + rôles de surface

- **Créer** `apps/frontend/src/styles/tokens.css`
- **Modifier** `apps/frontend/src/app/globals.css` → `@import './styles/tokens.css'` en tête, avant `@import 'tailwindcss'` si nécessaire (ou après ; vérifier l'ordre CSS)
- **Contenu** : `:root` avec les `--_x` privés + blocs dark (privés seulement) ; les tokens publics ne sont **jamais** assignés à une valeur littérale — uniquement l'indirection `var(--_x)` — et l'API Tailwind passe **exclusivement** par `@theme inline` (référence les variables runtime, ne les gèle pas)

```css
/* tokens.css — invariant : --_x écrits UNIQUEMENT dans :root + blocs dark ; publics = var() seulement */
:root { --_color-surface-work: #FFFFFF; --color-surface-work: var(--_color-surface-work); }
@theme inline { --color-surface-work: var(--_color-surface-work); }
```

- **Guard** (`scripts/guard-design.mjs`) : double invariant par scan des CSS — (1) tout `--_x:` hors bloc `:root`/`[data-theme]`/`.dark`/`@media (prefers-color-scheme: dark)` échoue ; (2) tout token public assigné à une valeur littérale (pas `var(...)`) échoue

## A2 — Bordures dark indépendantes

- **Modifier** `apps/frontend/src/styles/tokens.css` (bloc `.dark`) — overrides des **privés** + seam `--border` shadcn (implémenté)

```css
/* Bloc dark — hex FIXES, jamais dérivés de la rampe neutre (la rampe dark est si
   proche de la surface qu'une dérivation donne 1.00:1, bordure invisible).
   Ratios mesurés contre la surface de travail dark #232019 (2026-08-03). */
.dark, [data-theme="dark"] {
  --_color-border-subtle: #3A3A37;  /* 1.42:1 sur #232019 — séparateurs */
  --border:                #484844; /* 1.77:1 sur #232019 — standard (--color-border shadcn) */
  --_color-border-strong:  #6A6A66; /* 2.99:1 sur #232019 — hover, cadres */
}
```

- **Guard** (dans `guard-design.mjs`) : pour chaque palier d'arête en contexte dark — (a) hex fixe à 6 chiffres, (b) hex ≠ hex des surfaces dark du fichier (ratio 1:1 interdit), (c) commentaire `/* N.NN:1 */` sur la même ligne (implémenté, testé positif + négatif)

## A3 — No-backdrop-filter dans les zones de scroll

- **Modifier** `apps/frontend/src/styles/tokens.css` ou `globals.css` (règle utilitaire)
- **Modifier** `apps/frontend/src/components/layout/LayoutShell.tsx` → poser une classe `.app-scroll` sur le wrapper de contenu (implémenté : le scroll de l'app se fait sur `<body>` — pas de conteneur `overflow-auto` — la classe marque la région de contenu dans le flux de scroll)

```css
/* Seuls les éléments du scroll container perdent le blur ; les overlays shadcn
   (Dialog, Sheet, Toaster) sont portés sur <body> via portal → hors .app-scroll →
   ils GARDENT backdrop-blur. */
.app-scroll *, .app-scroll *::before, .app-scroll *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
```

- **Guard** (implémenté) : scan `src/components/**` (hors `ui/`) + `src/app/**` — `backdrop-blur-*` / `backdrop-filter` interdit, sauf allowlist nommée avec raison (Header, LandingHeader = nav fixes ; DashboardShell = scrim overlay mobile). Testé positif + négatif (fichier hors `ui/` échoue, fichier dans `ui/` passe)

## A4 — Bootstrap lang/dir + split display/data language

- **Modifier** `apps/frontend/src/app/[locale]/layout.tsx` → `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` (vérifier si next-intl le fait déjà ; sinon l'expliciter)
- **Utiliser** le mapping existant `DATA_LOCALE` (tzm → fr) pour tout contenu stocké (notifications, seeds) : la langue de données ne suit jamais la locale d'affichage

```tsx
// [locale]/layout.tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

- **Guard** : `scripts/guard-i18n.mjs` — parité des clés/placeholders entre `apps/frontend/messages/{fr,en,ar,tzm}.json` (référence = fr)

## A5 — Focus ring tokenisé

- **Modifier** `apps/frontend/src/styles/tokens.css`

```css
:root { --focus-ring-width: 2px; --focus-ring-color: var(--active-module-accent, var(--color-accent-brand)); --focus-ring-offset: 2px; }
```

- **Modifier** `globals.css` → `--ring: var(--focus-ring-color)` (les composants shadcn consomment déjà `--ring`, rien à changer dans `components/ui/`) + règle `:focus-visible` de base
- **Guard** : scan des composants — pas de `outline: <couleur littérale>` ; toute règle passe par `--focus-ring-*` ou `--ring`

## A6 — Accents par module + formule accent-sur-tint

- **Modifier** `apps/frontend/src/styles/tokens.css` → `--module-*` par section niveau 1, hue-séparés des couleurs de sévérité (danger/success), **chaque valeur porte son ratio AA mesuré en commentaire** ; `--active-module-accent` écrit par les layouts concernés (`src/app/(dashboard)/layout.tsx`, `src/app/[locale]/page.tsx`…)

```css
:root {
  --module-booking:   #0F766E;  /* Teal-700 — 5.06:1 sur blanc, AA */
  --module-dashboard: #6c3aed;  /* Violet — 6.06:1 sur blanc, AA */
  /* … chaque --module-* : ratio + fond de référence dans le commentaire */
}
```

- **Modifier** `globals.css` → classe utilitaire

```css
/* Texte sur fond teinté : la formule n'est PAS un token — elle doit s'évaluer là
   où --module-accent est défini (layout root de la section). Textes seulement ;
   les icônes gardent l'accent pur (3:1 suffit).
   Fallback : --color-accent-brand (--color-accent est pris par shadcn, hover cream). */
.accent-text-tint { color: color-mix(in srgb, var(--module-accent, var(--color-accent-brand)) 70%, var(--color-text-primary)); }
```

- **Application** : badges actifs, avatars initials, chips de statut (remplacer les `text-teal-*`/`text-amber-*` durs concernés)
- **Guard** : la formule `70%, var(--color-text-primary)` présente pour chaque usage de texte sur tint ; icônes exclues (accent pur, 3:1) ; chaque `--module-*:` suivi d'un commentaire contenant un ratio `N.NN:1`

---

## Ordre de commit (1 commit / item, style conventionnel)

1. `feat(design-system): add private/public token architecture and surface roles (A1)`
2. `feat(design-system): independent dark-mode border tokens (A2)`
3. `fix(design-system): disable backdrop-filter inside scroll containers (A3)`
4. `feat(design-system): tokenized focus ring via --ring (A5)`
5. `feat(design-system): module accents and accent-text-tint formula (A6)`
6. `feat(i18n): explicit lang/dir bootstrap and data-language split (A4)`

Règles : jamais de commit sur `main` ; chaque commit doit laisser le build vert (`pnpm --filter frontend build` + `pnpm --filter frontend lint`).

**Wiring des guards (point vérifié) :** il n'existe **aucun pipeline CI** dans le repo (pas de `.github/workflows`) — le hook `.husky/pre-commit` existant est donc la seule porte d'exécution. Wiring obligatoire dans le commit A1 :
1. `apps/frontend/package.json` → ajouter `"guard:design": "node scripts/guard-design.mjs"`
2. `.husky/pre-commit` → ajouter un bloc (même style que les blocs existants) : si des fichiers de `apps/frontend/src/` sont stagés, exécuter `pnpm --filter frontend guard:design` et `exit 1` en cas d'échec
3. Chaque item enrichit `scripts/guard-design.mjs` de son propre invariant dans son propre commit (le script doit exister dès A1, vide d'invariants hormis ceux de A1)
