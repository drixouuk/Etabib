# design-system/MASTER.md — drpediatre / dr-tabibi

**Version:** 1.2
**Statut:** Draft
**Généré par:** UI UX Pro Max + personnalisation, mis à jour par audit Claude
**Direction artistique:** Doux + rassurant + premium

> Ce fichier est la Source of Truth design pour le projet. Toute décision visuelle (couleurs, typo, espacement, effets) est documentée ici. Les pages spécifiques peuvent déroger via `design-system/pages/<page>.md`.

---

## Changelog v1.2

Décision : unifier les tokens de texte et d'ombre entre site public et espace praticien plutôt que de documenter la séparation comme permanente (la v1.1 avait laissé les deux options ouvertes). Ce changelog documente la cible ; à appliquer via le prompt Kilo Code correspondant.

- **Unification texte** — `ink`/`ink-soft`/`ink-softer` retirés, remplacés par `stone-800`/`stone-600`/`stone-400` partout, y compris dans l'espace praticien. Motivé par un vrai défaut, pas seulement une préférence : `ink-soft` mesurait 3,77:1 de contraste sur le fond dashboard, sous le seuil AA (4,5:1) que ce document fixe lui-même en §4.5/§9. `stone-600` mesure 7,50:1 à la même place. Voir historique en §2.7.
- **Unification ombre** — `shadow-warm-sm/md/lg` retirées, l'espace praticien utilise désormais les mêmes `shadow-sm/md/lg` (Tailwind natif) que le site public. Aucun rationale fonctionnel trouvé à la teinte chaude séparée ; à reconsidérer globalement plus tard si la teinte chaude est préférée esthétiquement, mais pas comme différenciation par surface. Voir §4.3.
- **Ce qui NE change PAS** — la navigation reste volontairement différente entre les deux surfaces (navbar flottante sur le site public, sidebar fixe sur le dashboard) : c'est un choix fonctionnel (usage occasionnel vs usage intensif toute la journée), pas une dérive. Voir §0 et §7.7, révisés en conséquence.
- **Corrigé en passant** — les deux écarts `bg-[#FFFDF8]` et `border-teal/15` relevés en §8.1 de la v1.1 sont résolus par le même chantier (`bg-cream-50`, `border-primary-600/15`).

---

## Changelog v1.1

Mise à jour après audit du repo (`drixouuk/dr_pediatre`, branche `main`) pour refléter ce qui est réellement implémenté, et après livraison de trois maquettes HTML (landing dr-tabibi, vitrine et login Dr Guinane) qui ont fait remonter plusieurs écarts entre ce document et le code.

- **Portée élargie** — v1.0 documentait uniquement le site vitrine. Le produit a grandi vers un espace praticien (dashboard) avec son propre vocabulaire de tokens, jamais documenté. Voir **§0** (nouveau).
- **Correction** — Next.js 15 → **16.2.9** réellement installé (§1).
- **Ajout** — tokens `ink` / `ink-soft` / `ink-softer`, utilisés exclusivement dans l'espace praticien, absents de la v1.0 (§2.7, nouveau).
- **Correction** — usage du CTA : la v1.0 décrivait un cycle repos/hover/press à 3 niveaux (`cta-500/600/700`). Le code réel utilise **trois paliers d'intensité selon le contexte** (site public / dashboard / accents), pas un cycle d'état. (§2.3, §7.2)
- **Correction** — le radius n'est pas l'échelle Tailwind native : `globals.css` la redéfinit via `calc(--radius * n)`. Les valeurs réelles de `xl`/`2xl`/`3xl` diffèrent de ce que documentait la v1.0. (§4.2)
- **Ajout** — `shadow-warm-*`, utilisées exclusivement dans l'espace praticien, absentes de la v1.0 (§4.3).
- **Correction** — poids de police réellement chargés par `next/font` : Figtree s'arrête à 700 (pas de 800), Noto Sans / Noto Sans Arabic n'ont pas de 600. Les trois maquettes HTML utilisaient du 800 par erreur — voir recommandation en §3.4.
- **Correction** — l'arabe charge une police dédiée `Noto_Sans_Arabic`, pas des subsets sur `Noto_Sans` (§3.1, §3.4).
- **Ajout** — composant Navigation flottante (§7.7), entièrement absent de la v1.0, documenté d'après `Header.tsx` + `use-scroll-direction.ts`.
- **Ajout** — composant Carte d'avis / témoignage (§7.8), utilisé sur la vitrine.
- **Ajout** — deux écarts anti-pattern concrets trouvés en audit, en exemple dans §8.1.

---

## 0. Une base commune, une divergence volontaire

Depuis la v1.2, le site public et l'espace praticien partagent le **même** vocabulaire de texte (`stone-*`) et d'ombre (`shadow-*`). La seule différence intentionnelle qui reste est la **navigation**, et elle est fonctionnelle, pas cosmétique :

|            | Site public (vitrine, landing, login, onboarding)                      | Espace praticien (dashboard)             |
| ---------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| Texte      | `stone-800` / `stone-600` / `stone-500` / `stone-400`                  | _idem_                                   |
| Ombres     | `shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-xl` (Tailwind natif) | _idem_                                   |
| Navigation | Navbar flottante, masquée au scroll — §7.7                             | Sidebar fixe `w-[252px]` + drawer mobile |
| CTA        | `cta-700` → hover `cta-800`                                            | `cta-600` → hover `cta-700`              |
| Fond       | `cream-100`                                                            | `cream-50`                               |

La navbar flottante convient à une page qu'on parcourt occasionnellement ; une sidebar fixe convient à un outil utilisé toute la journée où la navigation doit rester accessible en permanence pendant qu'on scrolle une fiche patient longue. **Ne pas unifier ce point** — voir §7.7.

Le CTA reste aussi à deux paliers (§2.3), mais ce n'est pas une divergence de surface au même sens : c'est une hiérarchie d'intensité (le CTA le plus rare et le plus important est le plus foncé), qui se justifie par la fréquence d'apparition du bouton, pas par la surface elle-même.

---

## 1. Identité projet

| Champ            | Valeur                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Projet           | dr-tabibi — SaaS multi-tenant de gestion de cabinet médical (le site vitrine Dr Guinane en est le premier tenant)     |
| Praticien pilote | Dr Guinane Aicha, pédiatre à Inezgane                                                                                 |
| Audience         | Parents marocains (Inezgane/Agadir), majorité arabophones/berbérophones ; côté SaaS, praticiens indépendants au Maroc |
| Locales          | `fr`, `en`, `ar` (RTL), `tzm` (Tifinagh)                                                                              |
| Stack            | Next.js **16** + Tailwind CSS + next-intl                                                                             |

### Direction artistique

- **Doux** : palette chaude, courbes douces, espacement généreux
- **Rassurant** : badges de confiance, certifications, témoignages, accessibilité WCAG AA+
- **Premium** : typographie forte, hiérarchie claire, finitions soignées (ombres subtiles, transitions fluides)

---

## 2. Palette de couleurs

### 2.1 Couleurs primaires

| Token             | Hex           | Usage                                 |
| ----------------- | ------------- | ------------------------------------- |
| `primary-50`      | `#F0FDFA`     | Surfaces teal très claires            |
| `primary-100`     | `#CCFBF1`     | Badges, tags                          |
| `primary-200`     | `#99F6E4`     | Bordures décoratives                  |
| `primary-300`     | `#5EEAD4`     | Icônes, accents légers                |
| `primary-400`     | `#2DD4BF`     | Liens secondaires                     |
| `primary-500`     | `#14B8A6`     | États hover primaires                 |
| **`primary-600`** | **`#0D9488`** | **Couleur principale (brand)**        |
| `primary-700`     | `#0F766E`     | Hover foncé, états actifs, logo       |
| `primary-800`     | `#115E59`     | Textes sur fond clair, footer vitrine |
| `primary-900`     | `#134E4A`     | Textes, icônes foncés                 |
| `primary-950`     | `#042F2E`     | Très foncé, rare                      |

> Ces tokens mappent sur l'échelle native Tailwind `teal`. Aucune extension nécessaire.

### 2.2 Couleurs secondaires (chaleur marocaine)

| Token               | Hex           | Usage                                      |
| ------------------- | ------------- | ------------------------------------------ |
| `secondary-50`      | `#FFFBEB`     | Surfaces ambrées très claires              |
| `secondary-100`     | `#FEF3C7`     | Badges, highlights                         |
| `secondary-200`     | `#FDE68A`     | Accents décoratifs                         |
| `secondary-300`     | `#FCD34D`     | Icônes warning doux                        |
| `secondary-400`     | `#FBBF24`     | Étoiles de notation (avis), accents actifs |
| **`secondary-500`** | **`#F59E0B`** | **Couleur secondaire (accents chauds)**    |
| `secondary-600`     | `#D97706`     | Hover secondaire                           |
| `secondary-700`     | `#B45309`     | Textes sur fond clair                      |
| `secondary-800`     | `#92400E`     | Textes, icônes foncés                      |
| `secondary-900`     | `#78350F`     | Très foncé                                 |

> Ces tokens mappent sur l'échelle native Tailwind `amber`.

### 2.3 Couleur CTA (call-to-action) — usage réel à 3 paliers

| Token              | Hex       | Usage                                                                                                                          |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `cta-50`–`cta-400` | —         | Fonds/badges CTA clairs, non utilisés en bouton plein                                                                          |
| `cta-500`          | `#F97316` | **Accents discrets uniquement** — pastille de notification, bordure fine de carte statistique. Jamais en fond de bouton plein. |
| `cta-600`          | `#EA580C` | **Palier dashboard** — fond par défaut des boutons d'action fréquents (Ajouter, Enregistrer, Administrer…)                     |
| `cta-700`          | `#C2410C` | Hover du palier dashboard **et** fond par défaut du **CTA principal du site public** (hero, nav)                               |
| `cta-800`          | `#9A3412` | Hover du CTA principal du site public                                                                                          |
| `cta-900`          | `#7C2D12` | Très foncé, rare                                                                                                               |

> ⚠️ **Correction v1.1** — la v1.0 documentait un cycle simple `cta-500` (repos) → `cta-600` (hover) → `cta-700` (press), comme un état unique à trois positions. Ce n'est **pas** ce qui est implémenté : `Header.tsx` et le hero (`page.tsx`) utilisent `bg-cta-700 hover:bg-cta-800` pour le CTA principal public, tandis que les dizaines de boutons d'action du dashboard utilisent `bg-cta-600 hover:bg-cta-700`, un ton plus clair — cohérent avec un dashboard dense où de nombreux boutons ne doivent pas tous crier aussi fort qu'un unique CTA de hero. `cta-500` n'apparaît que comme accent (points de notification `LiveStatsWidget.tsx`). Utiliser la règle : **plus le bouton est rare et important, plus le ton est foncé.**

### 2.4 Neutres chauds (fond crème, pas blanc clinique)

| Token           | Hex           | Usage                                                       |
| --------------- | ------------- | ----------------------------------------------------------- |
| `cream-50`      | `#FFFDF7`     | Fond le plus clair — y compris fond de la sidebar dashboard |
| **`cream-100`** | **`#FFFBF0`** | **Fond de page principal (site public)**                    |
| `cream-200`     | `#FFF7E0`     | Fond alternatif                                             |
| `cream-300`     | `#FEF0C7`     | Surfaces surélevées                                         |
| `cream-400`     | `#FDE8A7`     | Bordures chaudes                                            |
| `cream-500`     | `#FDE08A`     | Accents fond                                                |
| `cream-600`     | `#F5D06A`     | —                                                           |
| `cream-700`     | `#E8B84B`     | —                                                           |
| `cream-800`     | `#D4A02D`     | —                                                           |
| `cream-900`     | `#A67C1A`     | —                                                           |

> ⚠️ **Custom Tailwind** : `cream` n'existe pas nativement. Déclarée dans `globals.css` (voir §5).

### 2.5 Neutres texte & bordures — les deux surfaces (pierre chaude, pas gris froid)

| Token           | Hex           | Usage                                            |
| --------------- | ------------- | ------------------------------------------------ |
| `stone-50`      | `#FAFAF9`     | Surface alternative                              |
| `stone-100`     | `#F5F5F4`     | —                                                |
| `stone-200`     | `#E7E5E4`     | Bordures, séparateurs                            |
| `stone-300`     | `#D6D3D1`     | Bordures focus, disabled                         |
| `stone-400`     | `#A8A29E`     | Texte muted, placeholders, états vides           |
| `stone-500`     | `#78716C`     | Texte secondaire                                 |
| **`stone-600`** | **`#57534E`** | **Texte body / secondaire des deux surfaces**    |
| `stone-700`     | `#44403C`     | Texte headings secondaires                       |
| **`stone-800`** | **`#292524`** | **Texte principal / headings des deux surfaces** |
| `stone-900`     | `#1C1917`     | Texte très foncé                                 |
| `stone-950`     | `#0C0A09`     | —                                                |

> Ces tokens mappent sur l'échelle native Tailwind `stone`. Depuis v1.2, utilisés partout — site public (`sections/*`, `layout/*`, `login/*`, `page.tsx`, `onboarding/*`) **et** espace praticien (`(dashboard)/*`, `components/dashboard/*`). Avant v1.2, le dashboard utilisait `ink`/`ink-soft`/`ink-softer` — voir §2.7 pour l'historique.

### 2.6 Couleurs sémantiques

| Token         | Hex       | Usage                                   |
| ------------- | --------- | --------------------------------------- |
| `success-500` | `#22C55E` | Succès, confirmation                    |
| `success-600` | `#16A34A` | Texte succès                            |
| `success-50`  | `#F0FDF4` | Fond succès                             |
| `error-500`   | `#EF4444` | Erreur, danger                          |
| `error-600`   | `#DC2626` | Texte erreur                            |
| `error-50`    | `#FEF2F2` | Fond erreur                             |
| `warning-500` | `#F59E0B` | Avertissement (réutilise secondary-500) |
| `warning-50`  | `#FFFBEB` | Fond avertissement                      |
| `info-500`    | `#0EA5E9` | Information                             |
| `info-50`     | `#F0F9FF` | Fond info                               |

### 2.7 _(historique)_ `ink` / `ink-soft` / `ink-softer` — retirés en v1.2

Ces trois tokens ont existé un temps dans l'espace praticien seul (`ink` `#2A241C`, `ink-soft` `#8A8175`, `ink-softer` `#B9B2A4`), documentés en v1.1 après leur découverte en audit. Ils ont été retirés au profit de `stone-800`/`stone-600`/`stone-400` (§2.5) parce que :

1. Aucune raison fonctionnelle ne justifiait un vocabulaire de texte différent selon la surface (contrairement à la navigation, §0/§7.7, qui a une vraie raison).
2. `ink-soft` échouait le seuil WCAG AA — 3,77:1 de contraste sur le fond dashboard, sous le minimum de 4,5:1 fixé par ce document lui-même (§4.5). `stone-600` mesure 7,50:1 au même endroit.

Ne pas réintroduire `ink-*` sans revalider le contraste si jamais un besoin de hiérarchie de texte spécifique au dashboard réapparaît — repartir de `stone-500`/`stone-400` plutôt que de recréer une échelle parallèle.

### 2.8 Règle d'usage des couleurs

- **Ne jamais** utiliser les tokens Tailwind bruts (`teal-600`, `amber-500`) dans les composants
- **Toujours** utiliser les alias sémantiques (`primary`, `secondary`, `cta`, `cream`)
- Pour le texte : `stone-*` sur les deux surfaces (§2.5) — ne pas réintroduire de vocabulaire séparé pour le dashboard
- Exception : couleurs sémantiques (`success`, `error`) et couleurs one-shot dans `extend`

---

## 3. Typographie

### 3.1 Font families par locale

| Locale | Heading | Body                   | Direction |
| ------ | ------- | ---------------------- | --------- |
| `fr`   | Figtree | Noto Sans              | LTR       |
| `en`   | Figtree | Noto Sans              | LTR       |
| `ar`   | Figtree | **Noto Sans Arabic**   | **RTL**   |
| `tzm`  | Figtree | **Noto Sans Tifinagh** | LTR       |

- **Figtree** : Sans-serif géométrique chaud, excellente lisibilité, poids variables (300–700 réellement chargés — voir §3.4)
- **Noto Sans** : Sans-serif humaniste, latin
- **Noto Sans Arabic** : police dédiée pour l'arabe _(correction v1.1 — la v1.0 décrivait un seul `Noto_Sans` avec `subsets:['latin','arabic']` ; le code réel importe `Noto_Sans_Arabic` séparément)_
- **Noto Sans Tifinagh** : police spécifique pour le script Tifinagh (tzm)

### 3.2 Échelle typographique

_(inchangée — toujours d'actualité)_

| Token       | Taille            | Line-height      | Poids | Usage                      |
| ----------- | ----------------- | ---------------- | ----- | -------------------------- |
| `text-xs`   | `0.75rem` (12px)  | `1rem` (16px)    | 400   | Labels, badges             |
| `text-sm`   | `0.875rem` (14px) | `1.25rem` (20px) | 400   | Texte secondaire, captions |
| `text-base` | `1rem` (16px)     | `1.5rem` (24px)  | 400   | **Body (minimum 16px)**    |
| `text-lg`   | `1.125rem` (18px) | `1.75rem` (28px) | 400   | Body large, citations      |
| `text-xl`   | `1.25rem` (20px)  | `1.75rem` (28px) | 500   | Sous-titres                |
| `text-2xl`  | `1.5rem` (24px)   | `2rem` (32px)    | 600   | Titres de section mobile   |
| `text-3xl`  | `1.875rem` (30px) | `2.25rem` (36px) | 600   | Titres de section desktop  |
| `text-4xl`  | `2.25rem` (36px)  | `2.5rem` (40px)  | 700   | Hero mobile                |
| `text-5xl`  | `3rem` (48px)     | `1` (tight)      | 700   | Hero desktop               |
| `text-6xl`  | `3.75rem` (60px)  | `1` (tight)      | 700   | Hero large (optionnel)     |

### 3.3 Poids de police

| Poids | Token           | Usage                                                     |
| ----- | --------------- | --------------------------------------------------------- |
| 300   | `font-light`    | Texte décoratif, citations                                |
| 400   | `font-normal`   | Body, labels                                              |
| 500   | `font-medium`   | Sous-titres, navigation                                   |
| 600   | `font-semibold` | Titres, CTA — **⚠️ non chargé pour Noto Sans, voir §3.4** |
| 700   | `font-bold`     | Hero, emphasis forte                                      |

### 3.4 Chargement des polices — poids réels et recommandation

```ts
// apps/frontend/src/app/[locale]/layout.tsx — état réel du repo
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // pas de 800
  variable: "--font-heading",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"], // pas de 600
  variable: "--font-body",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"], // pas de 600 non plus
  variable: "--font-body",
});

const notoSansTifinagh = Noto_Sans_Tifinagh({
  subsets: ["tifinagh"],
  weight: ["400"],
  variable: "--font-tifinagh",
});
```

> ⚠️ **Correction v1.1** — les trois maquettes HTML livrées (landing dr-tabibi, vitrine et login Dr Guinane) utilisent `font-weight: 800` sur tous les titres. Implémenté tel quel dans le vrai `layout.tsx`, ce poids **ne rend pas** : Figtree charge jusqu'à 700 seulement, un `font-weight:800` sur un heading tomberait en fallback système (ou faux-gras du navigateur, rendu flou). De même, `font-semibold` (600) sur du texte en `font-body` (ex. nom d'auteur dans une carte d'avis) ne dispose pas du vrai 600 pour Noto Sans/Noto Sans Arabic.
>
> **Recommandation** : ajouter `'600'` (Noto Sans + Noto Sans Arabic) et `'800'` (Figtree) aux tableaux `weight` ci-dessus plutôt que de brider les maquettes à 700 — ce sont des fontes variables, le coût est marginal, et le 800 sert particulièrement bien le H1 de hero en direction "premium". À valider avant que Kilo Code n'implémente les pages.

---

## 4. Tokens de design

### 4.1 Espacement — Échelle 4px-based

_(inchangée)_

| Token      | Valeur          | Usage                       |
| ---------- | --------------- | --------------------------- |
| `space-1`  | `0.25rem` (4px) | Micro-espacement            |
| `space-2`  | `0.5rem` (8px)  | Icône↔texte, inline gaps    |
| `space-4`  | `1rem` (16px)   | Padding interne par défaut  |
| `space-6`  | `1.5rem` (24px) | Gap sections, cartes        |
| `space-8`  | `2rem` (32px)   | Padding sections mobiles    |
| `space-12` | `3rem` (48px)   | Padding sections desktop    |
| `space-16` | `4rem` (64px)   | Gap entre sections majeures |
| `space-20` | `5rem` (80px)   | Hero padding                |
| `space-24` | `6rem` (96px)   | —                           |

### 4.2 Bordures & Radius — échelle réelle (`calc`), pas les valeurs Tailwind natives

| Token           | Valeur réelle        | ≈ px    | ❌ Valeur documentée v1.0           |
| --------------- | -------------------- | ------- | ----------------------------------- |
| `radius-sm`     | `calc(0.5rem * 0.6)` | 4.8px   | 2px                                 |
| `radius-md`     | `calc(0.5rem * 0.8)` | 6.4px   | 6px                                 |
| **`radius-lg`** | **`0.5rem` (base)**  | **8px** | 8px _(seule valeur qui coïncidait)_ |
| `radius-xl`     | `calc(0.5rem * 1.4)` | 11.2px  | 12px                                |
| `radius-2xl`    | `calc(0.5rem * 1.8)` | 14.4px  | 16px                                |
| `radius-3xl`    | `calc(0.5rem * 2.2)` | 17.6px  | _(absent de la v1.0)_               |
| `radius-4xl`    | `calc(0.5rem * 2.6)` | 20.8px  | _(absent de la v1.0)_               |
| `radius-full`   | `9999px`             | —       | 9999px                              |

> ⚠️ **Correction v1.1** — `globals.css` redéfinit tout le radius via une variable de base `--radius: 0.5rem` et des multiplicateurs (`--radius-2xl: calc(var(--radius) * 1.8)`, etc.), un peu à la manière de shadcn/ui. Ce n'est **pas** l'échelle Tailwind par défaut que documentait la v1.0 — l'écart est faible pour `sm`/`md`/`xl` mais réel pour `2xl` (14.4px vs 16px) et surtout `3xl`/`4xl`, qui n'existaient pas du tout dans la v1.0 alors qu'ils sont utilisés (cartes hero, modales premium).

**Règle inchangée :** `radius-lg` (8px) par défaut pour tous les éléments interactifs.

### 4.3 Ombres — une échelle commune

Tailwind natif, utilisé sur les deux surfaces depuis v1.2 :

| Token        | Valeur                                                                  | Usage                                            |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `shadow-sm`  | `0 1px 2px 0 rgb(0 0 0 / 0.05)`                                         | Élévation minimale                               |
| **`shadow`** | **`0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.05)`**   | **Cartes (défaut), site public et dashboard**    |
| `shadow-md`  | `0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)`    | Cartes hover, dropdowns                          |
| `shadow-lg`  | `0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)`  | Modales, nav flottante (§7.7), drawers dashboard |
| `shadow-xl`  | `0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.05)` | Hero cards                                       |

**Règle :** ombres naturelles, pas de glow néon, profondeur douce — inchangé.

> _(historique)_ Le dashboard a eu, un temps, sa propre échelle `shadow-warm-sm/md/lg` (teinte `rgba(42,36,28,…)` au lieu de `rgb(0 0 0)`), retirée en v1.2 pour la même raison que `ink-*` en §2.7 : aucune justification fonctionnelle à une échelle différente selon la surface. La teinte chaude était plutôt réussie et cohérente avec la direction "doux" — si elle plaît, la réintroduire **globalement** (les deux surfaces) est une option esthétique légitime à envisager plus tard, mais pas comme marqueur de surface.

### 4.4 Transitions & Animations

_(inchangée)_

| Token              | Valeur                         | Usage                                                     |
| ------------------ | ------------------------------ | --------------------------------------------------------- |
| `duration-150`     | `150ms`                        | Micro-interactions (hover boutons)                        |
| **`duration-200`** | **`200ms`**                    | **Transitions standard (défaut)**                         |
| `duration-300`     | `300ms`                        | Transitions de page, modales, navigation flottante (§7.7) |
| `duration-500`     | `500ms`                        | Animations décoratives (max)                              |
| `ease-out`         | `cubic-bezier(0, 0, 0.2, 1)`   | Entrées, apparitions                                      |
| `ease-in-out`      | `cubic-bezier(0.4, 0, 0.2, 1)` | Transitions UI standard                                   |

**Règles animation :**

- `transition-colors duration-200` sur tous les éléments interactifs
- Pas d'animations >500ms
- `prefers-reduced-motion` : désactiver toutes les animations
- Pas de `transform: scale()` sur hover (layout shift)

### 4.5 Focus & Accessibilité

_(inchangée)_

| Propriété          | Valeur                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| Focus ring         | `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2` |
| Focus ring offset  | `2px`                                                                        |
| Touch target min   | `44x44px` (WCAG)                                                             |
| Contrast ratio min | `4.5:1` (texte normal), `3:1` (texte large)                                  |

---

## 5. Configuration Tailwind

### 5.1 `tailwind.config.ts` / `globals.css`

```typescript
import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: colors.teal,
        secondary: colors.amber,
        cta: colors.orange,
        cream: {
          "50": "#FFFDF7",
          "100": "#FFFBF0",
          "200": "#FFF7E0",
          "300": "#FEF0C7",
          "400": "#FDE8A7",
          "500": "#FDE08A",
          "600": "#F5D06A",
          "700": "#E8B84B",
          "800": "#D4A02D",
          "900": "#A67C1A",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Figtree", "sans-serif"],
        body: ["var(--font-body)", "Noto Sans", "sans-serif"],
        tifinagh: [
          "var(--font-tifinagh)",
          "Noto Sans Tifinagh",
          "Noto Sans",
          "sans-serif",
        ],
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
```

> Note : dans le repo réel, `cta-*` est déclaré via variables CSS dans `globals.css` (`--color-cta-500: var(--color-orange-500)`, etc.) plutôt que dans `tailwind.config.ts` — même résultat, convention Tailwind v4.

### 5.2 Convention de nommage Tailwind

| Règle                              | Exemple                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| **Alias sémantiques UNIQUEMENT**   | `bg-primary-600`, `text-primary-700`, `border-stone-200` |
| Jamais de couleurs Tailwind brutes | ❌ `bg-teal-600` → ✅ `bg-primary-600`                   |
| Couleurs custom via `extend`       | `bg-cream-100`, `text-stone-800`                         |
| États via préfixes Tailwind        | `hover:bg-primary-700`, `focus:ring-primary-500`         |
| Responsive via préfixes Tailwind   | `md:px-12`, `lg:text-5xl`                                |

---

## 6. Conventions RTL & i18n

_(inchangée — toujours exacte)_

### 6.1 Direction par locale

| Locale | Direction | Classe racine      |
| ------ | --------- | ------------------ |
| `fr`   | LTR       | `<html dir="ltr">` |
| `en`   | LTR       | `<html dir="ltr">` |
| `ar`   | RTL       | `<html dir="rtl">` |
| `tzm`  | LTR       | `<html dir="ltr">` |

### 6.2 RTL avec Tailwind

- Utiliser les préfixes **logiques** : `ms-*` (margin-start), `me-*` (margin-end), `ps-*` (padding-start), `pe-*` (padding-end)
- ❌ `ml-4`, `mr-4` → ✅ `ms-4`, `me-4`
- ❌ `pl-4`, `pr-4` → ✅ `ps-4`, `pe-4`
- ❌ `text-left`, `text-right` → ✅ `text-start`, `text-end`
- ❌ `rounded-l`, `rounded-r` → ✅ `rounded-s`, `rounded-e`

### 6.3 Font Tifinagh (`tzm`) et Arabic (`ar`)

```tsx
// layout.tsx
<body className={`font-heading ${
  locale === 'tzm' ? 'font-tifinagh' : locale === 'ar' ? notoSansArabic.variable : 'font-body'
}`}>
```

### 6.4 Images & icônes directionnelles

- Icônes directionnelles mirrorées en RTL avec `rtl:scale-x-[-1]`
- Exemple : `<ChevronRight className="rtl:scale-x-[-1]" />`

---

## 7. Conventions composants

### 7.1 Icônes

| Règle        | ✅ Do                              | ❌ Don't                           |
| ------------ | ---------------------------------- | ---------------------------------- |
| Bibliothèque | Lucide React (tree-shakeable)      | Emojis comme icônes                |
| Taille       | `size-5` (20px) ou `size-6` (24px) | Tailles variables aléatoires       |
| ViewBox      | `0 0 24 24` standard               | ViewBox non standard               |
| Touch target | Min 44x44px autour de l'icône      | Icône seule sans padding cliquable |

> Note maquettes : les trois fichiers HTML statiques livrés utilisent des SVG dessinés à la main (pas d'accès npm dans ce contexte), volontairement calqués sur le style Lucide (`viewBox 24x24`, `stroke-width` ~1.6–2, `stroke-linecap round`). L'implémentation Next.js réelle doit repasser par de vrais composants `lucide-react`, pas ces SVG inline.

### 7.2 Boutons

```tsx
// ✅ Bouton primaire — site public
<button
  className="
  inline-flex items-center justify-center gap-2
  px-6 py-3 rounded-lg
  bg-primary-600 text-white font-semibold
  hover:bg-primary-700
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  transition-colors duration-200
  cursor-pointer
  min-h-[44px] min-w-[44px]
"
>
  <IconName className="size-5" />
  {label}
</button>
```

| Variante          | Classes                                                                    | Surface                                           |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| **Primary**       | `bg-primary-600 text-white hover:bg-primary-700`                           | Les deux                                          |
| **Secondary**     | `bg-cream-200 text-primary-800 hover:bg-cream-300 border border-cream-400` | Les deux                                          |
| **CTA principal** | `bg-cta-700 text-white hover:bg-cta-800 font-bold`                         | Site public — hero, nav (rare, un seul par écran) |
| **CTA dashboard** | `bg-cta-600 text-white hover:bg-cta-700 font-medium`                       | Dashboard — boutons d'action fréquents            |
| **Ghost**         | `text-stone-600 hover:text-primary-600 hover:bg-cream-100`                 | Les deux                                          |
| **Disabled**      | `opacity-50 cursor-not-allowed pointer-events-none`                        | Les deux                                          |

### 7.3 Cartes

```tsx
// ✅ Carte standard — les deux surfaces
<div className="
  bg-white rounded-lg shadow
  border border-stone-200
  p-6
  hover:shadow-md transition-shadow duration-200
  cursor-pointer
">
```

### 7.4 Formulaire

```tsx
// ✅ Input standard
<input
  className="
  w-full px-4 py-3 rounded-lg
  bg-white border border-stone-300
  text-stone-800 placeholder:text-stone-400
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
  transition-colors duration-200
  min-h-[44px]
"
/>
```

### 7.5 Skip-to-content

```tsx
// ✅ Premier élément focusable
<a
  href="#main-content"
  className="
  sr-only focus:not-sr-only
  focus:fixed focus:top-4 focus:left-4 focus:z-50
  focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg
"
>
  Skip to main content
</a>
```

### 7.6 Responsive

| Breakpoint | Largeur      | Usage                                    |
| ---------- | ------------ | ---------------------------------------- |
| **Base**   | `< 640px`    | Mobile (défaut)                          |
| `sm`       | `640px`      | Grand mobile                             |
| `md`       | `768px`      | Tablette                                 |
| **`lg`**   | **`1024px`** | **Desktop (point de bascule principal)** |
| `xl`       | `1280px`     | Grand écran                              |
| `2xl`      | `1536px`     | Très grand écran                         |

- **Mobile-first** : commencer par le style mobile, ajouter `md:` puis `lg:`
- **Container** : `max-w-container mx-auto px-4 md:px-6 lg:px-8` (1200px)

### 7.7 Navigation flottante _(nouveau v1.1 — site public uniquement)_

Composant central du site public, absent de la v1.0. Documenté d'après `components/layout/Header.tsx`, la classe `.navbar-floating` de `globals.css`, et `hooks/use-scroll-direction.ts`.

```css
/* globals.css */
.navbar-floating {
  position: fixed;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  z-index: 50;
}
```

```tsx
// Header.tsx — structure
<header
  className={cn(
    "navbar-floating relative transition-transform duration-300",
    hidden && "-translate-y-[calc(100%+2rem)]",
  )}
>
  <nav
    className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md md:px-6"
    aria-label="Main navigation"
  >
    {/* logo, liens, CTA, language switcher */}
  </nav>
</header>
```

**Comportement** (`use-scroll-direction.ts`) : la barre se masque (translation vers le haut, hors écran) en scrollant vers le bas au-delà d'un seuil, et réapparaît en scrollant vers le haut — jamais masquée près du sommet de page. `duration-300`, comme le reste des transitions UI standard (§4.4).

**Ne pas confondre avec le dashboard** : l'espace praticien utilise une sidebar fixe (`aside w-[252px] border-r bg-cream-50`) + drawer mobile, pas cette navbar flottante. Les deux patterns de navigation ne se substituent pas l'un à l'autre.

**Corollaire pour tout site "vitrine" du SaaS multi-tenant** (dr-tabibi générique, tenants futurs) : réutiliser telle quelle cette navbar plutôt que d'en réinventer une par tenant — c'est un point de cohérence de marque transverse.

### 7.8 Carte d'avis / témoignage _(nouveau v1.1 — site public)_

D'après `components/sections/ReviewsSection.tsx`.

```tsx
<div className="flex h-full w-[280px] shrink-0 flex-col gap-3 rounded-2xl border border-stone-100 bg-cream-100 p-5 shadow-sm md:w-[320px]">
  {/* avatar cerclé — 1ère initiale, fond primary-500, texte blanc */}
  {/* nom + étoiles (secondary-400 pleines / stone-200 vides) */}
  {/* badge source (icône + "Google") aligné à droite */}
  {/* citation, tronquée à 120 caractères avec "Lire plus" */}
  {/* date */}
</div>
```

Défilement horizontal en piste `snap-x`, avance automatique toutes les 3.5s, pause au survol. Utilisé aussi bien pour les avis Dr Guinane que, potentiellement, pour un futur bloc "ils nous font confiance" sur le site dr-tabibi générique — dans ce cas remplacer le badge Google par un badge neutre.

---

## 8. Anti-patterns & Règles

### 8.1 Ne jamais faire

| ❌ Anti-pattern                                            | ✅ Correction                                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| `bg-teal-600` (couleur Tailwind brute)                     | `bg-primary-600` (alias sémantique)                             |
| `ml-4` (margin physique)                                   | `ms-4` (margin logique RTL-compatible)                          |
| `outline-none` sans remplacement                           | `focus:ring-2 focus:ring-primary-500`                           |
| Emojis comme icônes (🎨 🚀 ⚙️)                             | Lucide React SVG                                                |
| `transform scale-105` sur hover                            | `transition-shadow` + `shadow-md`                               |
| Textes `< 16px` pour le body                               | Minimum `text-base` (16px)                                      |
| Blanc pur `#FFFFFF` pour le fond page                      | `bg-cream-100` (chaud)                                          |
| Noir pur `#000000` pour le texte                           | `text-stone-800` (chaud)                                        |
| Animations > 500ms                                         | Max `duration-300`                                              |
| Dégradés violet/rose (AI-looking)                          | Palette teal/amber définie                                      |
| Réintroduire un vocabulaire texte/ombre séparé par surface | `stone-*` / `shadow-*` partout — voir §2.7 et §4.3 (historique) |

**Deux écarts trouvés en audit (repo réel), corrigés par le chantier d'unification v1.2 :**

| Où                        | Trouvé                                           | Corrigé en                                                            |
| ------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `DashboardShell.tsx` (×2) | `bg-[#FFFDF8]` (valeur arbitraire)               | `bg-cream-50` (`#FFFDF7`, quasi identique — autant utiliser le token) |
| `DashboardShell.tsx`      | `border-teal/15` (nom de couleur brut + opacité) | `border-primary-600/15`                                               |

### 8.2 Spécifique médical

- **Badges de confiance** : afficher certifications, années d'expérience, affiliations, note moyenne (ex. avis Google — voir §7.8)
- **Photos authentiques** : pas de stock photos génériques — photo réelle du praticien. À défaut de photo disponible, utiliser un cadre placeholder explicite (dégradé `primary-50→200` + médaillon/monogramme) plutôt qu'un faux portrait généré ou une stock photo — voir maquette vitrine.
- **Langage clair** : éviter le jargon médical excessif, rester accessible aux parents
- **Coordonnées visibles** : adresse, téléphone, horaires toujours à portée de clic

---

## 9. Checklist pré-livraison

### Qualité visuelle

- [ ] Aucun emoji utilisé comme icône (Lucide React uniquement)
- [ ] Icônes cohérentes (`size-5` ou `size-6`, ViewBox 24x24)
- [ ] Hover states sans layout shift (pas de `scale`)
- [ ] Couleurs sémantiques (`primary`, pas `teal-600`)
- [ ] **`stone-*`/`shadow-*` utilisés (pas de `ink*`/`shadow-warm-*` réintroduits)** — les deux surfaces partagent le même vocabulaire depuis v1.2
- [ ] Poids de police utilisés réellement chargés par `next/font` (pas de 800 sur Figtree ni 600 sur Noto Sans tant que §3.4 n'est pas résolu) — _nouveau_

### Interaction

- [ ] `cursor-pointer` sur tous les éléments cliquables
- [ ] Hover states avec feedback visuel clair
- [ ] Transitions `duration-200` sur tous les éléments interactifs
- [ ] Focus rings visibles (2px + offset 2px)

### Accessibilité

- [ ] Contraste texte ≥ 4.5:1 (normal), ≥ 3:1 (large)
- [ ] Touch targets ≥ 44x44px
- [ ] Skip-to-content link présent
- [ ] `alt` text sur toutes les images
- [ ] `aria-label` sur les boutons icônes seuls
- [ ] `role="alert"` sur les messages d'erreur
- [ ] `prefers-reduced-motion` respecté

### RTL & i18n

- [ ] Margins/paddings logiques (`ms-*`, `me-*`, `ps-*`, `pe-*`)
- [ ] Textes alignés logiquement (`text-start`, `text-end`)
- [ ] Icônes directionnelles mirrorées (`rtl:scale-x-[-1]`)
- [ ] Layout testé en arabe (RTL), avec `Noto_Sans_Arabic` et non `Noto_Sans`
- [ ] Police Tifinagh chargée et fonctionnelle en `tzm`

### Responsive

- [ ] Testé à 375px, 768px, 1024px, 1440px
- [ ] Pas de scroll horizontal
- [ ] Contenu non caché derrière la navbar flottante (padding-top suffisant — §7.7)
- [ ] `max-w-container` (1200px) cohérent sur toutes les sections

### Performance

- [ ] Fonts chargées via `next/font` (pas de CDN bloquant)
- [ ] Images avec `width`/`height` ou `fill` (pas de layout shift)
- [ ] Lighthouse ≥ 90 sur toutes les métriques

---

## 10. Références

| Ressource                         | Lien                                                                  |
| --------------------------------- | --------------------------------------------------------------------- |
| Figtree (Google Fonts)            | https://fonts.google.com/specimen/Figtree                             |
| Noto Sans (Google Fonts)          | https://fonts.google.com/noto/specimen/Noto+Sans                      |
| Noto Sans Arabic (Google Fonts)   | https://fonts.google.com/noto/specimen/Noto+Sans+Arabic               |
| Noto Sans Tifinagh (Google Fonts) | https://fonts.google.com/noto/specimen/Noto+Sans+Tifinagh             |
| Lucide React (icônes)             | https://lucide.dev                                                    |
| Tailwind CSS docs                 | https://tailwindcss.com/docs                                          |
| WCAG 2.1 AA                       | https://www.w3.org/TR/WCAG21/                                         |
| RTL Styling (Tailwind)            | https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support |
