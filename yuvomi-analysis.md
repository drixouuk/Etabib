# Analyse Yuvomi → Patterns pour dr-tabibi

> **Source analysée :** `/home/driss/myprojects/yuvomi-main/` (lecture seule, v1.75.3)
> **Documents clés :** `docs/SPEC.md` (2471 lignes, documente *chaque* décision technique), `public/styles/tokens.css` (1333 l.), `public/styles/glass.css` (1030 l.), `public/components/detail-view.js`, `public/i18n.js`, `server/services/google-calendar.js` (1086 l.), `server/services/calendar-outbound.js`, `server/services/recurrence.js`, `server/services/search.js`, `test/test-frontend-audit.js` (6292 l.), `test/test-layer-boundary.js`, `test/test-sw-precache.js`.
> **Stack cible dr-tabibi :** Next.js 16 + Payload CMS v3 (apps/cms), frontend Next.js 16 + next-intl + Tailwind v4 + shadcn + `@schedule-x/calendar` (apps/frontend).
> **Date :** 2026-08-03. Aucun code n'a été modifié dans dr-tabibi — ce document est un livrable d'analyse.

---

## 0. Résumé exécutif

Yuvomi est un planner familial self-hosted, **zero build step** (ES modules purs, vanilla JS), SQLite, mono-instance, 23 locales. Sa valeur pour dr-tabibi n'est pas le code (stack radicalement différente) mais **la discipline d'ingénierie** : chaque token, chaque micro-animation, chaque flag de sync est documenté dans SPEC.md avec le ratio de contraste mesuré, l'issue GitHub et le test guard qui empêche la régression.

Les patterns suivants sont **transposables directement** :

| # | Pattern | Complexité | Valeur pour dr-tabibi |
|---|---|---|---|
| 1 | Architecture de tokens public/privé (`--_x` / `--x`) | Faible | Dark mode sans duplication |
| 2 | Rôles de surface `work` / `raised` / `glass` | Faible | Le glass décoratif ne pollue jamais les surfaces lisibles |
| 3 | Formule de contraste accent-sur-tint `color-mix(... 70%, text)` | Faible | Accents par module lisibles AA/AAA partout |
| 4 | Règle « no backdrop-filter dans le scroll container » | Faible | Corrige le bug iOS/Android blank-screen (#166) |
| 5 | Focus ring tokenisé + `--active-module-accent` | Faible | Un seul ring, couleur du module actif |
| 6 | Bootstrap `lang`/`dir` render-blocking dans le `<head>` | Faible | RTL arabe sans flash ni mauvaise détection |
| 7 | **Look first, edit second** (`detail-view.js`) | Moyenne | Dossiers patients sur mobile : lecture sans clavier |
| 8 | RRULE subset + EXDATE + scope « this/this&following/all » | Moyenne | Plages de disponibilité médecins |
| 9 | Sync Google : flags + tombstones + `outbound_dirty` | Élevée | Sync agenda médecin ↔ Google Calendar |
| 10 | Ledger immuable (jamais de solde stocké) | Faible | Registre d'audit médical |
| 11 | Test guards statiques (`frontend-audit`, `layer-boundary`, `sw-precache`) | Faible | Empêche les régressions au commit |
| 12 | FTS5 diacritic-insensitive + ß↔ss | Faible | Recherche patients « Mueller » → « Müller » |

---

## 1. Design System & micro-interactions (Liquid Glass)

### 1.1 Architecture des tokens : public/privé

**Le pattern central** (`tokens.css:49-150`) : chaque token public pointe vers un token privé `--_x` ; les blocs dark mode ne réécrivent **que** les tokens privés. L'API publique (`--color-surface`, `--glass-bg-card`…) reste stable et n'est jamais dupliquée entre `@media` et `[data-theme]`.

```css
:root {
  --_color-surface:       #FFFFFF;
  --color-surface:        var(--_color-surface);   /* API publique stable */
  --_color-surface-glass: rgba(255, 255, 255, 0.70);
  --color-surface-glass:  var(--_color-surface-glass);
}

/* Dark mode : un seul bloc, seulement les privés */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {   /* :not() = l'override explicite light gagne */
    --_color-surface:       #222220;
    --_color-surface-glass: rgba(34, 34, 32, 0.78);
  }
}
[data-theme="dark"] { /* même bloc, pour l'override explicite dark quand l'OS est light */ }
```

**En Tailwind v4 pour dr-tabibi** : déclarer ces tokens dans `@theme` (ou `@theme inline`) :

```css
/* apps/frontend/src/app/globals.css */
@theme inline {
  --color-surface:       var(--_color-surface);
  --color-surface-glass: var(--_color-surface-glass);
}
/* les --_x privés vivent dans :root et dans les blocs dark */
```

Règle d'or yuvomi à reprendre : **un composant ne lit jamais `--_x`** ; les tokens privés ne sont écrits que dans `:root`/`[data-theme]`.

### 1.2 Rôles de surface (discipline « work vs glass »)

Trois rôles séparés (v0.55.7, audit UX) :

```css
--color-surface-work:    #FFFFFF;                /* surfaces de travail lisibles (listes, tableaux) */
--color-surface-raised:  #FAFAF8;                /* élévation subtile (hover) */
--color-surface-glass:   rgba(255,255,255,0.70); /* décoratif uniquement : nav, modales, hero */
```

**Règle :** les pages productives (agenda, dossier patient, formulaire) utilisent `work`/`raised` **opaques** ; le glass est réservé aux overlays, nav, widgets légers. Un guard statique (`test-frontend-audit.js:4022`) vérifie que les listes productives (`task-card`, `shopping-item:hover`) utilisent `--color-surface-work` et **jamais** `--glass-bg-card` ni `backdrop-filter`. Pour dr-tabibi : même règle sur les `Card` de dossier patient — le glass sur une surface de travail est une régression, pas une décoration.

### 1.3 Tokens glass (Section 16 de tokens.css)

```css
--glass-bg:           rgba(255,255,255,0.72);  /* nav */
--glass-bg-card:      var(--_color-surface-glass);  /* 52% → vibrancy des cartes */
--glass-bg-input:     rgba(255,255,255,0.82);
--glass-bg-toolbar:   rgba(255,255,255,0.86);
--glass-border-subtle: rgba(255,255,255,0.35);
--blur-sm: blur(8px); --blur-md: blur(16px); --blur-lg: blur(28px);
--radius-glass-card: 20px;  --radius-glass-inner: 14px;  --radius-glass-button: var(--radius-full);
--ease-glass: cubic-bezier(0.34, 1.56, 0.64, 1);   /* spring : overshoot léger */
--transition-glass: 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
--glass-inset-medium: inset 0 1px 0 rgba(255,255,255,0.22);  /* specular top-edge */
--glass-shadow-md: 0 4px 20px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.50);
```

Détail précieux : les `--glass-shadow-*` incluent une **bordure simulée** `0 0 0 1px rgba(255,255,255,…)` — le liseré clair typique du verre. Et le specular (`--glass-inset-*`, `--glass-highlight-*`) reproduit le reflet du bord supérieur iOS 26.

**Progressivité** (`glass.css:22-34`) — le blur est TOUJOURS dans `@supports`, les couleurs/bords/shadows toujours dehors :

```css
.nav-bottom {
  background-color: var(--glass-bg);
  border-top: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow-sm);
}
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .nav-bottom {
    backdrop-filter: var(--blur-md) saturate(180%);
    -webkit-backdrop-filter: var(--blur-md) saturate(180%); /* Safari < 18 */
  }
}
```

### 1.4 Tint par module (vibrancy)

Chaque surface glass reçoit une teinte du module actif via `::after` :

```css
.card--glass {
  background-color: var(--glass-bg-card);
}
.card--glass::after {
  background-color: color-mix(in srgb, var(--module-accent, var(--color-accent)) var(--glass-tint-strength), transparent);
  /* --glass-tint-strength: 6% light / 8% dark — subtil, jamais criard */
}
```

Le fond ambiant : `.app-shell` (viewport, `height: 100dvh`, **ne scroll pas**) porte un dégradé radial avec l'accent du module à ~2-3 % d'opacité ; `.app-content` (scroll) reste opaque. **C'est un split délibéré** : un dégradé `color-mix()` sur un élément `overflow: auto` provoque des bugs de rasterisation (blank screen) sur iOS WebKit et Android Blink (v0.52.32, cf. SPEC.md:2321).

**Transposition dr-tabibi :** dans l'app shell Next.js, `body`/`html` reçoit le fond, et le `main` scrollable reste `bg-surface`. L'accent du module courant peut être porté par un data-attribute sur `<html>` mis à jour dans un layout (équivalent de leur `--active-module-accent` posé par le router).

### 1.5 Micro-animations universelles

| Animation | Implémentation | Note |
|---|---|---|
| Transition de page directionnelle | Slide-X 200 ms, spring `--ease-glass`, sens = ordre de navigation (forward = from right) | Respecte `prefers-reduced-motion` (0.01ms) |
| Stagger des listes | `stagger()` (`public/utils/ux.js`) : max 5 éléments, 30 ms de gap, reste immédiat | Early-return si reduced-motion |
| Feedback bouton success | Checkmark 700 ms vert (`.btn--success`) | |
| Feedback bouton error | Shake (`.btn--shaking`) | |
| FAB | Pulse d'attention `fab-ring-pulse` + specular | |
| Modale mobile | Bottom sheet, spring slide-in, swipe-to-close > 80px | |
| Pille de nav active | 200 ms transform/opacity (pas de width animée) | |

```js
// public/utils/ux.js — snippet exact
export function stagger(elements, { delay = 30, duration = 180, max = 5 } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = Array.from(elements);
  els.forEach((el, i) => {
    const itemDelay = i < max ? i * delay : max * delay;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, itemDelay);
  });
}
```

**En React/Tailwind :** `transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]` sur un wrapper + `useReducedMotion()` de `framer-motion`/base-ui, ou plus simple : une classe `.list-stagger > *` avec `animation` en CSS et la duration annulée sous `prefers-reduced-motion` (c'est exactement ce que fait yuvomi — le stagger vit en CSS, pas en JS).

### 1.6 La règle anti-bug mobile (la plus importante de cette section)

```css
/* glass.css:441 — Même règle, corrige #166 (iOS) + Android */
.app-content *,
.app-content *::before,
.app-content *::after {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  filter: none !important;
}
```

Tout élément avec `backdrop-filter` dans un `overflow:auto` devient un layer GPU indépendant ; avec beaucoup de cartes (liste de rendez-vous, dossier patient), le compositor mobile explose → écran blanc au scroll. **Les éléments hors du scroll container (nav, modales, toasts) gardent leur blur.** L'apparence glass dans les zones scrollables est obtenue par background semi-transparent + bordure + ombre seuls.

**dr-tabibi :** avec Tailwind, soit une règle globale `main * { backdrop-filter: none !important; }`, soit — mieux — la convention de n'utiliser `backdrop-blur-*` que dans les composants overlay (`Dialog`, `Sheet`, `Toaster`, `NavigationMenu` de shadcn, qui sont portés en overlay).

---

## 2. Accessibilité & Performance

### 2.1 Contraste : formule « accent sur tint »

Le problème : un texte dans la couleur brute de l'accent, posé sur un fond teinté de ce même accent, a un contraste dépendant uniquement de la luminosité de l'accent — 13 des 17 modules rataient AA (jusqu'à 2.84:1). La formule documentée `tokens.css:308` :

```css
/* Textes sur fond teinté (chips actifs, badges, avatars) :
   la formule est délibérément PAS un token : elle doit s'évaluer là où
   --module-accent est défini (les modules posent --module-accent sur leur root). */
color: color-mix(in srgb, var(--module-accent) 70%, var(--color-text-primary));
```

- Les 30 % d'encre décalent le texte **dans la direction du thème** (plus sombre en light, plus clair en dark) parce que `--color-text-primary` bascule avec le thème.
- Résultat mesuré : pire cas 4.99:1 (light) / 5.32:1 (dark), hue conservé → identité du module intacte.
- **Textes seulement.** Les icônes gardent l'accent pur (3:1 suffit pour les icônes).

**Transposition dr-tabibi (Tailwind v4) :**

```ts
// apps/frontend/src/lib/cn.ts — ou une classe utilitaire
// text-[color-mix(in_srgb,var(--module-accent)_70%,var(--color-text-primary))]
// En Tailwind v4, l'arbitrary value avec underscores remplace les espaces.
```

Ou plus proprement : `.accent-text-tint { color: color-mix(in srgb, var(--module-accent) 70%, var(--color-text-primary)); }` dans `globals.css`. Chaque module (rendez-vous, dossier, documents…) définit `--module-accent` sur son layout root.

### 2.2 Préférences utilisateur — trois blocs, rôles distincts

| Préférence | Action yuvomi |
|---|---|
| `prefers-reduced-motion: reduce` | Toutes les animations passent à ~0.01 ms ou `none` ; `vibrate()` ne s'exécute pas ; le comptage des balances ne s'anime pas |
| `prefers-reduced-transparency: reduce` | Tout blur/glass désactivé → fonds **opaques** (`--color-surface`), ombres réduites |
| `prefers-contrast: more` | Ring de focus renforcé, sous-lignage des nav items, `--lg-blob-opacity: 0` (backdrop disparaît) |

```css
/* glass.css:183 — l'approche : remplacer par des équivalents solides, pas « un peu moins de flou » */
@media (prefers-reduced-transparency: reduce) {
  .nav-bottom__indicator::before { background: color-mix(in srgb, var(--active-module-accent, var(--color-accent)) 14%, var(--color-surface)); box-shadow: none; }
  .btn--primary, .btn--primary:hover, .fab, .fab:hover { box-shadow: var(--shadow-sm); }
}
```

**dr-tabibi :** Tailwind v4 gère nativement `motion-reduce:` et `contrast-more:`. Ajouter `transparency-reduce:` via un variant custom (ou un bloc `@media` dans globals.css). Point non négociable pour un SaaS médical : les états réduits doivent être **visuellement complets**, pas dégradés.

### 2.3 Focus ring tokenisé (v1.60.0)

Avant : six spécifications concurrentes, 45 règles locales → le focus alternait violet/orange en tabulant sur /shopping. Après :

```css
/* tokens.css §7b — trois tokens, PAS de shorthand (un shorthand sur :root
   baiserait la couleur à la déclaration et rendrait les overrides locaux muets) */
--focus-ring-width:        2px;
--focus-ring-color:        var(--active-module-accent, var(--color-accent));
--focus-ring-offset:       2px;
--focus-ring-offset-inset: -2px;   /* pour éléments sur bord clippé (overflow:hidden) */

/* Les composants écrivent les DEUX lignes ; les exceptions justifiées
   ne surchargent QUE --focus-ring-color (FAB, swatches, danger buttons). */
:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

Et `prefers-contrast: more` **redéfinit les tokens**, jamais `outline-width` directement (une propriété sur `:focus-visible` (0,1,0) perdait contre les règles composant).

**dr-tabibi :** shadcn centralise déjà le focus via Tailwind (`focus-visible:outline`). Adapter : `outline-2 outline-offset-2` avec `outline-[var(--focus-ring-color)]`, et poser `--active-module-accent` sur `:root` depuis le layout du module courant.

### 2.4 Performance / PWA : le contrat de version

- **Zero build step** côté front : ES modules purs chargés nativement. (Sans objet pour Next.js — mais le *principe* « le chargement ne doit jamais traverser une frontière de version » l'est.)
- **Precache complet du graphe d'import** (`test:sw-precache.js`) : le guard parcourt le graphe transitif des imports statiques de chaque module précaché et échoue si un module dépendant manque. Le bug #616 : après une mise à jour, une page fraîche s'était liée à des modules partagés **anciens** → `SyntaxError: does not provide an export named…`.
- **Pas de chargement de page à cheval sur deux versions** : dès que `SW_UPDATED` est annoncé, le router arrête d'importer des modules et la navigation suivante force un reload ; un import dynamique qui échoue sur une erreur de binding déclenche le même reload (avec marqueur `sessionStorage` 30 s pour éviter les boucles).
- Caches nommés par version de release ; purge des caches d'anciennes versions à l'activation ; cache API **read-only** réseau-d'abord pour données hors-ligne, vidé au logout.

**dr-tabibi :** le cache réseau-d'abord read-only est transposable tel quel (données agenda/patients consultables hors-ligne), avec purge au logout et par version de build (nom de cache = `buildId` Next.js). La règle « no page load across a version boundary » est déjà gérée par le service worker/`next start` et le versioning URL de Next, mais à vérifier pour la stratégie stale-while-revalidate.

### 2.5 Typo & composants

- Une seule famille self-hosted ; échelle sémantique via `--type-*` ; **inputs et prose à 16px** (anti-zoom iOS) ; texte lisible et contrôles interactifs ≥ 14px.
- `--page-inline-pad: max(var(--page-gutter), calc((100% - var(--content-max-width)) / 2))` — le head de page et le contenu partagent une seule fluchtlinie (issue #577), gardé par test.
- Grid tracks textuels en `minmax(0, 1fr)` pour que le contenu localisé long ne déborde jamais.
- **Touch targets :** `--target-base: 44px`, basculé à 48px sous `@media (hover: none)` — le critère est la capacité de pointage, pas la largeur de fenêtre (un tablette 1180px a besoin de cibles tactiles).

---

## 3. Dark mode & theming

### 3.1 Bordure indépendantes en dark (v1.57.0 — le piège exact)

En dark, la rampe neutre est si proche de `--color-surface` (#222220) que `--color-border-subtle` dérivé de la rampe résolvait à **la couleur exacte de la surface** (1.00:1) : les cartes n'avaient plus de bordure. Fix : les trois étapes d'arête sont **définies indépendamment** en dark, pas dérivées :

```css
/* Dark : ratios mesurés contre --color-surface */
--color-border-subtle: #3A3A37;  /* 1.40:1 — séparateurs, carte calme */
--color-border:        #4A4A46;  /* 1.79:1 — bord standard, champs */
--color-border-strong: #6B6B68;  /* 2.98:1 — hover, cadres accentués */
--glass-border-subtle: rgba(255, 255, 255, 0.12);  /* 1.5:1 — champs de recherche/quick-add */
```

Le commentaire dans tokens.css documente aussi la décision délibérée inverse : en light, l'arête des champs (#E8E7E2, 1.24:1) reste sous le 3:1 exigé par WCAG 1.4.11 pour les *contrôles* — un `--color-border-control` séparé serait le chemin propre, mais changer la teinte de tous les inputs de l'app est une décision à part. **Pour dr-tabibi :** ne jamais dériver les bordures dark d'une formule ; fixer des hex mesurés (la mesure au commit est documentée dans tokens.css).

### 3.2 Accents par module

- **Un accent par module de niveau 1** (pas par onglet) : la Kitchen group (4 onglets) porte UN accent. Avant, un changement d'onglet changeait la couleur du même item de nav — « la plus forte des signaux 'tu as quitté ce module' de l'UI, dépensée pour rester sur place » (v1.58.0).
- Application sur trois couches visuelles : (1) item de nav actif, (2) `border-top: 3px` de la toolbar, (3) `border-left: 3px` des cartes/rows.
- `--active-module-accent` est écrit sur `:root` à chaque navigation ; fallback `--color-accent` hors contexte module.
- Les couleurs de module sont **hue-séparées des couleurs de sévérité** : `--color-danger` (rouge) ≠ `--module-health` (berry fuchsia) ; chaque valeur porte son ratio AA/AAA mesuré dans le commentaire (ex. `--module-pantry: #4D7C0F` « 4.99:1 sur blanc, 4.54:1 sur bg — WCAG AA »).

**dr-tabibi :** définir `--module-appointments`, `--module-records`, `--module-documents`… avec le ratio mesuré dans le commentaire, et une palette de sévérité distincte. Même règle « un accent par section de niveau 1 ».

---

## 4. Module Agenda / Calendrier

### 4.1 Vues et sélecteur

Quatre vues : **Month** (grille, dots sur mobile), **Week** (grille horaire, avec chevauchements rendus en colonnes côte à côte), **Day** (timeline), **Agenda** (liste). Détails UX :

- Sur mobile, le **premier chargement** par défaut = Agenda ; le choix manuel est persisté (localStorage) pour les visites suivantes.
- Semaine mobile = fenêtre de 3 jours autour du curseur.
- Sélecteur de vue = `wireTablist` partagé (roving tabindex, flèches, Home/End) — même grammaire d'interaction que tous les tabs de l'app.
- `week_start` configurable (lundi/dimanche/samedi), numéro de semaine ISO toujours ancré lundi.
- Les chips de tâches avec `due_date` apparaissent en lecture seule dans les 4 vues.
- Durée de rendez-vous par défaut mémorisée dynamiquement (changer la fin met à jour la durée mémorisée ; changer le début re-dérive la fin).
- **Saisie d'heure flexible** (`parseTimeInput()` dans i18n.js) : `0930`, `930`, `09.30`, `9,30`, `9h30`, `9 am` → normalisé au format de la locale au blur. Snippet exact (i18n.js:400-438) — le séparateur `h`, la forme compacte HMM/HHMM, le 12h/24h.

**dr-tabibi :** le frontend utilise déjà `@schedule-x/calendar` (cf. `apps/frontend/package.json`). Le pattern à reprendre : persistance de la vue par device, défaut mobile = liste/agenda, `weekStart` utilisateur, et le parseur d'heure flexible (transposable tel quel dans un util TS — il n'a aucune dépendance).

### 4.2 « Look first, edit second » — le composant `detail-view.js` (v1.70.0)

**Le pattern à voler pour les dossiers patients.** Taper un rendez-vous (ou une tâche) ouvrait le formulaire → le clavier virtuel couvrait ~40 % de l'écran pour quelqu'un qui voulait juste savoir « quand ». Désormais le tap ouvre une **vue lecture seule sans aucun input** (le clavier ne peut structurellement pas s'ouvrir — garanti par la structure, pas par un autofocus retiré). « Edit » est une intention nommée dans le header qui monte le formulaire seulement alors.

Points d'ingénierie (documentés et gardés par `test:detail-view.js`) :

```js
// public/components/detail-view.js
const POPOVER_MIN_WIDTH = 768;
// Deux présentations, une API : ≥768px ET avec ancre → popover ancré au chip ;
// sinon bottom-sheet via openModal().
export function openDetailView({ title, accentColor, anchor, sections, actions, edit, size, onClose }) { … }

// Descripteurs de lignes, pas de markup : les lignes vides tombent d'elles-mêmes.
export function detailRowEl({ icon, label, value, node, multiline } = {}) {
  const hasContent = node instanceof HTMLElement || (typeof value === 'string' && value.trim().length > 0);
  if (!hasContent) return null;
  // … construit via createElement/textContent — jamais innerHTML
}

// Jeton d'ancienneté : une réponse serveur tardive se jette si sa vue a été remplacée.
let activeViewToken = 0;
// if (activeViewToken !== token) return false;  // update() se rejette

// L'ordre du switch vers le formulaire est gardé par test :
// mount() → mountFooter() → refreshDirtySnapshot() → focusFirstField()
// Le formulaire reste dans le DOM au retour : « Back », pas « Done ».
```

D'autres décisions liées : la vue lecture montre des choses que le popup d'avant cachait (règle de récurrence en clair via `describeRRule()`, rappels, visibilité) ; le statut d'une tâche s'avance directement depuis la lecture ; les actions de footer ferment avec `force: true` (pas de fausse question « abandonner ? » pour des champs que la suppression emporte de toute façon — la règle #625).

**dr-tabibi — dossier patient mobile :** `Sheet` (shadcn) en lecture seule + bouton « Modifier » qui monte le formulaire. Transposable en React pur :

```tsx
// apps/frontend/src/components/patient/patient-detail.tsx (esquisse)
export function PatientDetail({ patient, onEdit }: { patient: Patient; onEdit: () => void }) {
  // Aucun <input> dans ce composant : le clavier mobile ne peut pas s'ouvrir.
  // Les lignes vides sont filtrées (détailRowEl fait pareil).
  return (
    <Sheet>
      <SheetHeader>
        <SheetTitle>{patient.name}</SheetTitle>
        <Button variant="ghost" onClick={onEdit}>Modifier</Button>
      </SheetHeader>
      <dl>
        {patient.phone && <DetailRow icon="phone" label={t('patient.phone')} value={patient.phone} />}
        {/* … */}
      </dl>
    </Sheet>
  );
}
```

Et le jeton d'ancienneté est trivial en React (ref d'id de vue + check avant `setState` d'une réponse async).

### 4.3 Récurrences : le sous-ensemble RRULE propre

Yuvomi n'implémente **pas** la RRULE complète (RFC 5545) — un sous-ensemble maîtrisé, la bonne décision pour un produit médical :

```
FREQ (DAILY/WEEKLY/MONTHLY/YEARLY) + INTERVAL + BYDAY,
+ fin mutuellement exclusive : UNTIL **ou** COUNT.
```

`server/services/recurrence.js` (159 lignes, sans dépendance — directement transposable en TS) :

```js
// Points clés du parseur/expander :
// - FREQ=DAILY;BYDAY=X compte des JOURS (Apple/iOS sérialise « chaque jour
//   ouvré » ainsi, #549) ; FREQ=WEEKLY;BYDAY=X compte des semaines.
// - Monthly : clamp du jour au dernier jour du mois (31 mars + 1 mois → 30 avril).
// - Yearly : 29 février → 28 février les années non bissextiles.
// - nextOccurrenceAfter(base, rule, notBefore) : rattrape les séries en retard
//   (boucle bornée à 1000) — utilisé par les tâches récurrentes en retard.
// - COUNT est compté depuis DTSTART et INCLUT les dates exclues (RFC 5545 :
//   la limite s'applique avant l'EXDATE) — COUNT=10 avec 1 exclusion = 9 vues.
```

**Exceptions (`calendar_event_exceptions`, migration v85, #532)** : une ligne par date exclue (`event_id`, `exception_date` PK composé), skippée sur **tous** les chemins de lecture (liste, upcoming, recherche, export ICS). Le dialogue de suppression/édition d'une occurrence d'une série offre un choix de scope unique (select, défaut = « cet événement seul », le moins destructeur) :

| Action | « Seul cet événement » | « Celui-ci et les suivants » | « Toute la série » |
|---|---|---|---|
| Delete | EXDATE (la série continue) | RRULE tronquée avec `UNTIL` = veille de l'occurrence | Master supprimé |
| Edit | EXDATE + événement détaché non récurrent | Master tronqué + nouvelle série depuis l'occurrence | Master mis à jour, `DTSTART` préservé |

Le scope n'est offert que pour les séries **locales** — les séries synchronisées (Google/CalDAV/ICS) gardent le comportement « toute la série », car une EXDATE locale reviendrait à la prochaine sync.

**dr-tabibi — plages de disponibilité :** même sous-ensemble FREQ/INTERVAL/BYDAY + UNTIL/COUNT, avec exceptions pour les jours sans consultation (congés ponctuels). En Payload : stocker la règle en string iCal + une relation `exceptions` (ou array de dates), et réutiliser le parseur TS ci-dessus pour l'expansion côté serveur (fonction pure, testable). L'UI du choix de scope (radio/select) est transposable telle quelle.

### 4.4 Recherche contextuelle : FTS5 diacritic-insensitive

`server/services/search.js` — recherche plein-texte dans le calendrier (barre de recherche dans la toolbar du calendrier, raccourci `f`) et recherche globale :

```sql
-- Migration 77 : tokenizer unicode61, diacritiques ignorées
CREATE VIRTUAL TABLE search_index USING fts5(
  entity, entity_id, search_index,
  tokenize = 'unicode61 remove_diacritics 2'
);
```

```js
// buildMatchQuery() — requête MATCH sûre : tokens en phrases + préfixe,
// variantes ß↔ss en OR, tokens en AND. Null si rien de cherchable.
function eszettVariants(token) {
  return new Set([
    token,
    token.replace(/ß/g, 'ss').replace(/ẞ/g, 'ss'),
    token.replace(/ss/gi, 'ß'),
  ]);
}
// tokens.map(t => `("${v.replace(/"/g,'""')}"*)` join ' OR ') … join ' AND '
```

- « muller » matche « Müller », « strasse » matche « Straße » — **transposable à la recherche patients/noms arabes** (remove_diacritics gère aussi les diacritiques arabes/hébreux).
- L'index est maintenu par triggers des deux côtés (row + tables join de tags).
- Résultats de recherche calendrier : liste chronologique groupée par date, ancrée sur la prochaine occurrence, récurrence résolue à sa prochaine occurrence dans une fenêtre de 2 ans, cap à 100 résultats, `role="button"`/Enter/Space.
- `remove_diacritics` ne traite **pas** ß — d'où les variantes explicites.

**dr-tabibi :** si la recherche patient passe par PostgreSQL, l'équivalent est `unaccent` + trigram (`pg_trgm`) ou `ILIKE` — mais le pattern de requête sécurisée (phrases + préfixes, aucune entrée brute dans un MATCH) reste la leçon.

---

## 5. Synchronisation Google Calendar (two-way sync)

### 5.1 Architecture actuelle (mono-foyer)

**OAuth 2.0** : `access_type: offline` + `prompt: consent` (obligatoire pour obtenir un refresh token), scope `calendar` seul, state CSRF de 32 bytes en session, tokens stockés dans une table clé/valeur (`sync_config`). Le client googleapis sauvegarde automatiquement les tokens renouvelés via l'événement `tokens` (google-calendar.js:450).

**Sync incrémental par calendrier** (`sync_token` par ligne de `google_calendar_selection`) :

```js
// google-calendar.js:565-610 — le cœur de l'inbound
const listParams = { calendarId, singleEvents: false, showDeleted: true, pageToken };
if (syncToken) { listParams.syncToken = syncToken; }
else {
  // PAS de timeMin en full resync : sans singleEvents, la fenêtre est testée
  // contre le DÉBUT de la série, pas ses occurrences — une série hebdomadaire
  // commencée en 2019 sortirait de la requête. Un master remplace toutes ses instances.
  listParams.timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
}
try {
  response = await calendar.events.list(listParams);
} catch (err) {
  if (err.code === 410) {          // syncToken expiré
    recordSyncToken(calendarId, null);  // → prochain run = full resync
    syncToken = null; continue;
  }
  throw err;
}
```

Détails décisifs pour que les séries fonctionnent en deux sens :
- **`singleEvents: false`** : une série arrive comme UN master portant sa RRULE (sinon collision avec les séries uploadées, #593).
- **`showDeleted: true`** : une occurrence unique annulée n'est visible que comme instance cancelled → c'est de là que vient l'EXDATE.
- **Masters avant les déviations**, quelle que soit l'ordre de retour de Google (une exception a besoin de son master pour attacher l'EXDATE).
- Annulation scoping au calendrier qui la rapporte (déplacement entre calendriers Google = cancelled dans la source + actif dans la destination, même eventId — un delete par ID seul effaçait le mauvais).
- Mode read-only (`google_readonly`) : lit mais ne pousse rien.
- Disable d'un calendrier : événements importés supprimés + `sync_token` NULL → re-enable = resync propre.

**Les flags de données** (le cœur du modèle anti-écrasement) :

| Colonne | Rôle |
|---|---|
| `external_source` | `local` / `google` / `apple` / `ics` / `caldav` — provenance |
| `external_calendar_id` | ID de l'événement chez le provider (clé d'upsert) |
| `calendar_ref_id` | FK vers `external_calendars` (nom/couleur du calendrier provider) |
| `user_modified` | 0/1 — l'utilisateur a touché à l'événement (couleur notamment) → l'inbound ne l'écrase plus. **Permanent** |
| `outbound_dirty` | 0/1 — modification locale pas encore poussée. **File, pas état** : posé à l'édition, effacé après push. Posé UNIQUEMENT si un champ miroir change (`MIRRORED_FIELDS = title, description, location, color, all_day, start_datetime, end_datetime, recurrence_rule`) — assignment/visibilité/icône sont internes |
| `outbound_attempts` | compteur d'échecs, abandon après 5 |
| `outbound_move_to` | déplacement de calendrier queué ; posé depuis le *changement dans la requête*, jamais par comparaison d'état (une divergence d'état héritée créerait une vague de moves silencieux) |

**Tombstones** (`calendar_pending_deletions`, migration v103, #593) : supprimer un événement miroir localement doit le supprimer chez le provider, mais l'appel est async et ne doit ni retarder le `204` ni échouer le delete local — la ligne survit à l'événement supprimé et est travaillée par le sync (**at-least-once**). Créée **uniquement** par le delete utilisateur explicite, jamais par trigger (l'inbound supprime aussi des lignes locales — cancelled, calendriers déselectionnés — et un trigger enverrait des deletes au provider).

**La file partagée (`calendar-outbound.js`)** — le fichier le plus réutilisable du projet :

```js
export const MIRRORED_FIELDS = ['title','description','location','color','all_day','start_datetime','end_datetime','recurrence_rule'];
export const MAX_OUTBOUND_ATTEMPTS = 5;

// Classification des erreurs provider → action
export function classifyOutboundError(err) {
  const status = err?.code ?? err?.response?.status ?? err?.status;
  if (status === 404 || status === 410) return 'settled';   // déjà atteint / objet disparu
  if (status === 400) return 'permanent';                    // échouera toujours (ex. move d'une instance)
  return 'retry';                                            // tout le reste, dont 403 (rate limit) et 5xx
}

// L'ordre du sync : outbound d'abord, inbound ensuite — une suppression locale
// ne doit pas être ré-importée par un full resync, et une édition locale doit
// atteindre Google avant que l'inbound ne l'écrase avec l'ancien état.
```

`flushOutbound()` fait un **best-effort immédiat** après chaque édition/suppression locale (sans attendre l'intervalle de polling, défaut 15 min) ; l'échec est sans conséquence car la file reste.

### 5.2 Transposition vers dr-tabibi (multi-tenant)

Yuvomi est mono-foyer : les tokens vivent dans une table clé/valeur unique. dr-tabibi a **un médecin = un compte Google = ses propres tokens**. La transposition :

| Yuvomi | dr-tabibi (Payload) |
|---|---|
| `sync_config` (clé/valeur globale) | Collection `googleConnections` : `doctor` (relation Users), `accessToken` crypté, `refreshToken` crypté, `tokenExpiry`, `readonly`, `lastSync`, `googleOAuthState` |
| `google_calendar_selection` (une table globale) | Collection `googleCalendarSelection` : `connection`, `calendarId`, `name`, `color`, `enabled`, `syncToken`, `lastSync` |
| `calendar_events.external_source` | Collection `appointments` : `source: 'local' \| 'google'`, `externalEventId`, `externalCalendarId` (relation), `userModified`, `outboundDirty`, `outboundAttempts`, `outboundMoveTo` |
| `calendar_pending_deletions` | Collection `googlePendingDeletions` : `connection`, `calendarExternalId`, `eventExternalId`, `attempts`, `lastError` (UNIQUE composé) |
| Scheduler node-cron unique | Un job par connexion (ou un job qui itère les connexions), intervalle configurable par médecin |

Les garde-fous à **conserver tels quels** :
1. `user_modified` (l'éditeur local gagne) ≠ `outbound_dirty` (file) — ne pas fusionner les deux, c'est le piège documenté (SPEC.md:539).
2. Tombstone créé par le delete explicite uniquement ; l'inbound ne doit pas recréer une ligne dont le tombstone est ouvert (le full resync #593).
3. Ordre outbound → inbound ; `singleEvents: false` + `showDeleted: true` + pas de `timeMin` en resync ; 410 → reset du token.
4. Move = `events.move` avant le patch ; destination non-writable → la file de move est abandonnée (pas de retry infini) ; sur succès, mise à jour locale de `calendar_ref_id`/`external_calendar_id` sinon un delete ultérieur viserait l'ancien calendrier.
5. Read-only par médecin.
6. Échec 400 permanent → abandon immédiat au lieu de brûler 5 tentatives.
7. En outbound, ne pousser que les **champs miroirs** ; une liste de champs explicite empêche les pushs intempestifs (les champs internes — statut dossier, notes privées — ne doivent jamais fuiter vers Google).
8. Les événements d'une série venant de Google gardent le comportement « toute la série » pour delete/edit d'une occurrence (une EXDATE locale serait écrasée à la prochaine sync).

**Recommandation produit pour dr-tabibi :** la liste des champs poussés vers Google ne devrait contenir que titre/lieu/heures (jamais les notes de consultation) — le pattern `MIRRORED_FIELDS` devient une contrainte RGPD.

---

## 6. Rigueur, bugs de prod & test guards

### 6.1 Les bugs de prod comme documentation

Chaque bug est référencé dans SPEC.md avec son issue et le fix structurel (pas le patch) :

| Issue | Bug | Fix structurel |
|---|---|---|
| #166 | Blank screen iOS au scroll avec backdrop-filter | Règle globale no-blur dans `.app-content` + split shell/scroll |
| #443 | (Flexible time entry) | `parseTimeInput()` centralisé |
| #532 | Édition/suppression d'occurrence de série | Exceptions + scope choice partagé |
| #586 | Catégorie par défaut `Sonstiges` inexistante après migration | Rebuild de table + re-homing des orphelins |
| #593 | Outbound = `events.insert` seulement : edits/deletes locaux ne partaient pas | Tombstones + `outbound_dirty` + queue partagée |
| #616 | Page fraîche liée à des modules partagés anciens (export manquant) | Precache du graphe complet + reload au `SW_UPDATED` |
| #625 | « Delete » demandait d'abandonner les champs du formulaire | Footer actions en `force: true` (l'objet part de toute façon) |
| #631/#632 | Notification server-side sans la langue du destinataire | Notifications = données brutes (pas de phrase), langue = client ; split display vs data language |

### 6.2 Les test guards (le pattern à répliquer en CI dr-tabibi)

Ce sont des **scans statiques** (node:test + regex/AST sur les sources), pas des tests e2e — rapides et exécutés à chaque commit. Les plus réutilisables :

```js
// test-layer-boundary.js — l'invariant d'architecture au commit.
// 1) public/ n'importe JAMAIS depuis server/ ; 2) server/ n'importe depuis
// public/ que les modules isomorphes d'une allowlist explicite.
// Transposable : apps/frontend n'importe jamais depuis apps/cms, et réciproquement ;
// les utils partagés vivent dans un package/ dossier isomorphe allowlisté.
```

```js
// test-sw-precache.js — graphe d'import transitif : chaque module importé par un
// module précaché DOIT être précaché ; cohérence bucket de cache ↔ routing fetch.
// Transposable : vérifier la liste des préchargés Next (ou le manifeste PWA)
// contre le graphe réel des pages.
```

```js
// test-frontend-audit.js — les invariants UX/CSS, dont :
// - Viewport-Breakpoints : SEULS 640/768/1024/1440 (+ compléments) sont autorisés.
//   const allowed = new Set([639, 640, 767, 768, 1023, 1024, 1439, 1440]);
//   → le reflow composant-interne doit passer par @container queries.
// - Fokusringe lisent --focus-ring-* (pas de `outline` littérale dans les composants).
// - Pas d'innerHTML dans les fichiers audités.
// - Les surfaces productives n'utilisent pas --glass-bg-card ni backdrop-filter.
// - Les icônes n'ont pas de width/height inline (taille via classes tokenisées).
// - Chaque page de recherche utilise le composant partagé, pas un <input> nu.
// - Les tokens dark @media et [data-theme="dark"] restent synchrones (diff).
// - Les noms de classes utilisés existent dans les stylesheets.
```

Le guard budget (SPEC.md:2353) est exemplaire : il ne vérifie pas une allowlist de sélecteurs mais **scanne toutes les règles** de budget.css et exige que toute règle portant `--glass-bg-card` nomme un rôle d'overlay (`modal`, `dialog`, `popover`, `overlay`, `menu`…) — « un nouveau module ne peut pas réintroduire le glass en silence ».

**Checklist guards dr-tabibi (proposée) :**
1. `test:layer-boundary` — frontend ↔ cms.
2. `test:i18n` — les locales de référence (fr) définissent tous les keys/placeholders ; les autres locales ont le même jeu de keys (le test yuvomi `test:i18n` tient 22 locales contre la référence).
3. `test:breakpoints` — Tailwind v4 : interdire les breakpoints custom (vider `screens` à 640/768/1024/1440 et garder la liste par test sur les sources).
4. `test:glass-discipline` — pas de `backdrop-blur` dans les composants non-overlay.
5. `test:contrast` — les couleurs d'accent déclarées portent un ratio AA documenté (scan des commentaires ou table de tokens).
6. `test:accessibility` — les composants `Dialog`/`Sheet` préservent `prefers-reduced-*` (motion, transparency).

### 6.3 Le registre « Ledger » (pattern pour l'audit médical)

Le solde d'un membre n'est **jamais stocké** : il est toujours `SUM(delta)` sur `reward_ledger` — chaque action est une ligne immuable (`type`, `delta` +/−, `reason`, FK, `created_by`, `created_at`), jamais mise à jour, jamais supprimée. Points clés :

- **Idempotence** : `INSERT OR IGNORE` + index unique partiel `(task_id, user_id) WHERE type='earn'` — une complétion ne crédite jamais deux fois, même rejouée.
- **Réversibilité** : quitter l'état `done` d'une tâche inverse l'écriture (nouvelle ligne `reversal`), pas de mutation de l'originale.
- **Snapshot** : les redemptions stockent nom/icône/coût au moment de la demande — l'historique ne bouge pas quand le catalogue est édité.
- SQL : `SELECT COALESCE(SUM(delta),0) AS bal FROM reward_ledger WHERE user_id = ?` (rewards.js:17).

**dr-tabibi — registre d'audit médical (dossier patient) :**

```ts
// Collection Payload : auditLedger — immuable par construction
// (access: create uniquement ; pas d'update/delete en API)
{
  slug: 'audit-ledger',
  fields: [
    { name: 'patient', type: 'relationship', relationTo: 'patients', required: true },
    { name: 'actor',   type: 'relationship', relationTo: 'users', required: true },   // qui (médecin)
    { name: 'action',  type: 'text', required: true },  // created | updated | viewed | exported | …
    { name: 'entity',  type: 'text', required: true },  // 'appointment' | 'prescription' | 'document'
    { name: 'entityId', type: 'text', required: true },
    { name: 'detail',  type: 'json' },                  // snapshot des champs modifiés (avant/après)
    { name: 'occurredAt', type: 'date', required: true },
  ],
  timestamps: true,
}
```

Règles yuvomi à importer : jamais de solde/mise à jour en place (l'historique complet = la vérité), idempotence par index unique partiel sur les événements qui pourraient être rejoués, snapshot des valeurs au moment de l'action, et une réversion (rectification) = nouvelle ligne `reversed_by`/`reversal_of`, pas une suppression.

---

## 7. Internationalisation (i18n) & RTL

### 7.1 Architecture

- Fichiers JSON **imbriqués par module** (`{"tasks": {"newTask": "…"}}`), `t('tasks.newTask')` — les call-sites restent plats, les fichiers restent diffables par module. (Pour dr-tabibi : c'est exactement la structure `messages/[locale].json` de next-intl.)
- **Locales de référence** : Yuvomi = `de` ; dr-tabibi = `fr`. Le test `test:i18n` tient toutes les autres contre la référence : même jeu de keys, mêmes `{{placeholders}}`, même format.
- **Fallback chain** : locale active → locale de référence → la key elle-même.
- **Pluriels via `Intl.PluralRules`** (`i18n.js:100-127`) — la catégorie CLDR est calculée, pas `count === 1` (allemand 2 formes, polonais 4, japonais 1) :

```js
function resolvePluralKey(key, count) {
  const category = pluralCategory(currentLocale, count);
  for (const candidate of [`${key}_${category}`, `${key}_other`, key]) {
    const hit = resolve(translations, candidate) ?? resolve(fallbackTranslations, candidate);
    if (hit != null) return hit;
  }
  return key;
}
// t('key', { count }) → key_one / key_few / … → key_other → key
```

- **Substitution sûre des variables** (`t()`, i18n.js:149-156) : un seul passage avec regex + callback — jamais `replaceAll(string, string)` (qui interprète `$&`, `` $` ``, `$'`, `$$` comme back-references : un contact nommé `A $& B` rendait `A {{name}} B`) et jamais de boucle (un nom `{{date}}` était ré-scanné par le placeholder suivant). Les placeholders inconnus **restent visibles** (un paramètre oublié ne disparaît pas en silence). Gardé par `test:i18n-plural`.

```js
export function t(key, params = {}) {
  const str = typeof params.count === 'number'
    ? resolvePluralKey(key, params.count)
    : resolve(translations, key) ?? resolve(fallbackTranslations, key) ?? key;
  return str.replace(/\{\{(\w+)\}\}/g, (placeholder, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder
  ));
}
```

- **Deux langues distinctes** (la distinction la plus importante pour dr-tabibi) : la **display language** (par utilisateur, ce que l'UI rend — localStorage → `navigator.languages[0]` → fallback) et la **data language** (par foyer/admin, ce que le serveur *stocke* — noms de catégories, titres générés). C'est la solution aux issues #631/#632 : les notifications serveur portent des **données brutes** (`Name - 12.99 EUR - 2026-08-03`), jamais de phrase, car le serveur ne connaît pas la langue du destinataire.

### 7.2 Bootstrap RTL (le pattern à voler)

`public/lang-init.js` — script **render-blocking dans le `<head>`** qui résout la locale et pose `lang` + `dir` **avant le premier rendu** (et l'applique à nouveau à chaque `setLocale`). La motivation (#631/#632 côté client) : `index.html` livrait `lang="de"` statique ; Chromium proposait « traduire depuis l'allemand » sur des systèmes non germanophones, et i18n.js corrigeait `lang` trop tard (l'heuristique de traduction avait déjà décidé).

```js
(function() {
  var SUPPORTED = ['de','en','es','fr','it','sv','el','ru','tr','zh','ja','ar','hi','pt','uk','pl','nl','cs','vi','hu','ko','id','fa'];
  var STORAGE_KEY = 'yuvomi-locale';
  function resolve() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) { /* localStorage bloqué (privé) */ }
    var browserLocales = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < browserLocales.length; i++) {
      var base = String(browserLocales[i]).split('-')[0].toLowerCase();
      if (SUPPORTED.indexOf(base) !== -1) return base;
    }
    return 'en';
  }
  var locale = resolve();
  document.documentElement.lang = locale;
  document.documentElement.dir = (locale === 'ar' || locale === 'fa') ? 'rtl' : 'ltr';
})();
```

**dr-tabibi :** next-intl gère déjà le `dir` sur `<html>` à partir de la config de locales, et le middleware de détection (`Accept-Language` + cookie) fait le travail de `resolve()`. La leçon à vérifier : la détection doit produire `lang`/`dir` **avant** le premier rendu (next-intl le fait par statique `generateStaticParams` ou middleware — OK), et le changement de locale en cours de session doit rafraîchir le layout (logique CSS : utiliser `dir(rtl):` de Tailwind v4 / propriétés logiques `ps-* pe-* start-* end-*` — yuvomi applique la même règle « logical properties partout »). Le piège spécifique yuvomi : **les breakpoints/gutters et la pille de nav doivent être symétriques en RTL** — leurs guards vérifient l'usage de propriétés logiques pour les composants adaptés RTL (test-frontend-audit.js:3517 « hardening uses logical alignment for RTL-sensitive adapted controls »).

### 7.3 Formatage (région ≠ langue)

`getFormatLocale()` sépare la locale de **nombre** (région stockée, ex. `de-CH` → `123'456.78`) de la locale d'UI. Les formats de date/heure sont des préférences explicites (`dmy`/`mdy`/`ymd`, `24h`/`12h`) hors de la locale. Cache des `Intl.NumberFormat` par (locale × options) — construction chère sur les pages avec beaucoup de nombres. Les noms de mois/jours viennent de `Intl`, pas de fichiers de locales.

---

## 8. Checklist d'implémentation priorisée pour dr-tabibi

### Phase A — Fondations (coût faible, gain immédiat)

- [ ] **A1. Tokens public/privé + rôles de surface** (`work`/`raised`/`glass`) dans `globals.css` ; blocs dark ne touchant que les `--_x`. Ratios de contraste mesurés dans les commentaires (pattern tokens.css).
- [ ] **A2. Bordures dark indépendantes** (3 étapes hex mesurées, jamais dérivées de la rampe) — évite le bug 1.00:1.
- [ ] **A3. Règle no-backdrop-filter dans le scroll container** + convention d'usage de `backdrop-blur` limité aux overlays (shadcn `Dialog`/`Sheet`/`Toaster`).
- [ ] **A4. Bootstrap `lang`/`dir`** : vérifier que next-intl pose `dir="rtl"` avant le premier rendu pour `ar` ; garder le split display-language vs data-language dès le début (les contenus Payload stockés en français ne doivent pas dépendre de la locale du visiteur).
- [ ] **A5. Focus ring tokenisé** : un seul composant utilitaire shadcn, `--focus-ring-color` = `var(--active-module-accent, var(--color-accent))`, exceptions justifiées seulement.
- [ ] **A6. Formule accent-sur-tint** `.accent-text-tint` + un accent de module par section de niveau 1 (rendez-vous, patients, documents), hue-séparés des couleurs de sévérité.

### Phase B — Agenda & dossier patient (cœur produit)

- [ ] **B1. « Look first, edit second »** : le tap sur un rendez-vous/patient ouvre une `Sheet` lecture seule (zéro input → zéro clavier), « Modifier » monte le formulaire ; jeton d'ancienneté contre les réponses async tardives ; footer en `force` (pas de faux « abandonner ? »).
- [ ] **B2. Parseur d'heure flexible** (`parseTimeInput` porté en TS) pour tous les inputs heure du frontend.
- [ ] **B3. RRULE subset** (FREQ/INTERVAL/BYDAY + UNTIL|COUNT) + table d'exceptions + UI de scope (cet événement / ceux-ci et les suivants / toute la série) pour les plages de disponibilité. Séries synchronisées → scope « toute la série » uniquement.
- [ ] **B4. Persistance de la vue calendrier** par device + défaut mobile = liste ; `weekStart` par utilisateur ; intégration aux vues `@schedule-x` (ou évaluation d'un switch vers des vues maison si le composant de chevauchement/couleurs par médecin est trop contraint).
- [ ] **B5. Recherche diacritic-insensitive** : `unaccent`+`pg_trgm` (PostgreSQL) ou FTS5 (SQLite dev), requête sécurisée phrases+préfixes, variantes explicites si la langue cible (arabe, tzm) a des équivalents du ß.

### Phase C — Sync Google Calendar (la plus lourde)

- [ ] **C1. Modèle de données** : collections Payload `googleConnections` (tokens chiffrés par médecin), `googleCalendarSelection` (syncToken par calendrier), flags sur `appointments` (`source`, `externalEventId`, `externalCalendarId`, `userModified`, `outboundDirty`, `outboundAttempts`, `outboundMoveTo`), `googlePendingDeletions` (tombstones).
- [ ] **C2. Moteur de sync** : ordre outbound → inbound ; `singleEvents:false` + `showDeleted:true` + pas de `timeMin` en resync ; 410 → reset token ; events.move avant patch ; 400 permanent → abandon ; max 5 tentatives ; flush best-effort post-édition.
- [ ] **C3. `MIRRORED_FIELDS`** restreint (titre, lieu, heures, couleur) — jamais les notes de consultation (RGPD).
- [ ] **C4. Scheduler** : job par connexion (ou itérateur), intervalle configurable ; le pattern polling (pas de webhooks) de yuvomi est le bon choix de départ.

### Phase D — Registre d'audit & rigueur

- [ ] **D1. Ledger d'audit médical** : collection immuable (create-only), index unique partiel pour l'idempotence, rectification = nouvelle ligne, snapshot des valeurs.
- [ ] **D2. Guards CI statiques** : `test:layer-boundary` (frontend ↔ cms), `test:i18n` (locales vs référence fr), `test:breakpoints` (canoniques 640/768/1024/1440), `test:glass-discipline` (pas de blur hors overlay), `test:focus-ring` (pas d'outline littérale).
- [ ] **D3. Documentation des bugs comme SPEC.md** : chaque fix structurel documenté avec l'issue et la raison (le fichier SPEC.md de yuvomi est le modèle — `docs/` de dr-tabibi a déjà `PRD.md` ; ajouter une section « décisions techniques »).
- [ ] **D4. Offline read-only** (cache réseau-d'abord des données agenda/patients consultables, purge au logout et par version de build) — à planifier avec la PWA.

### Hors périmètre (délibérément non recommandé)

- Le « Zero build step » (ES modules purs) — sans objet avec Next.js ; en garder le *principe* (contracts de version des caches).
- Les 23 locales — dr-tabibi a 4 locales ; garder l'architecture (référence + test de parité), pas l'échelle.
- Le système de modules activables par utilisateur — déjà couvert par Payload/access control.
- Le modèle « un accent par module » au-delà de 4-5 sections — l'ajout de couleurs dilue l'identité.

---

## Annexe — Index des fichiers sources clés de yuvomi

| Fichier | Ce qu'on y trouve |
|---|---|
| `docs/SPEC.md` | Toute la spécification + les décisions documentées (issues, ratios) |
| `public/styles/tokens.css` | Tokens public/privé, focus ring, glass §16, dark mode, breakpoints §11c |
| `public/styles/glass.css` | Liquid Glass, règle anti-blank-screen, tint par module, prefers-* |
| `public/i18n.js` | `t()`/pluriels/substitution sûre, `parseTimeInput`, formatage région/langue |
| `public/lang-init.js` | Bootstrap `lang`/`dir` render-blocking |
| `public/components/detail-view.js` | « Look first, edit second » (lecture avant édition) |
| `public/rrule-ui.js` | `describeRRule` — la récurrence en langage clair dans l'UI |
| `public/utils/ux.js` | `stagger`, `vibrate`, `scheduleUndoableDelete` (undo avec keepalive au pagehide), `withBusy` (restaure le focus) |
| `server/services/google-calendar.js` | OAuth, syncToken, singleEvents/showDeleted, palette de couleurs 24h |
| `server/services/calendar-outbound.js` | File partagée : tombstones, `outbound_dirty`, `outbound_move_to`, classification d'erreurs, flush immédiat |
| `server/services/recurrence.js` | Parser/expander RRULE subset (sans dépendance) |
| `server/services/search.js` | FTS5 `buildMatchQuery` sûr + ß↔ss |
| `test/test-frontend-audit.js` | ~80 guards UX/CSS : breakpoints, focus ring, glass, i18n, innerHTML… |
| `test/test-layer-boundary.js` | Frontend ↔ backend (invariant d'architecture) |
| `test/test-sw-precache.js` | Grappe d'imports PWA complète + cohérence bucket/routing |
| `test/test-detail-view.js` | Contrats du pattern lecture-avant-édition |
