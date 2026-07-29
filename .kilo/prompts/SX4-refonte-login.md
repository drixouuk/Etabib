# LOT SX-4 — Refonte page login (maquette → code)

## Contexte

Remplacer l'actuelle page login (simple card centrée) par la maquette `docs/Maquette/dr-guinane-login.html`. **Zéro déviation visuelle.**

**⚠️ IMPORTANT :** L'espace praticien (login + dashboard) est **uniquement en français**, par décision produit. Tous les textes sont en dur en français dans le composant. **Pas de `useTranslations()`, pas de `next-intl`, pas de clés i18n dans `messages/*.json`.**

## Design system mapping

La maquette utilise des tokens obsolètes. Les mapper aux tokens v1.2 (MASTER.md) :

| Maquette | Token MASTER.md |
|---|---|
| `--teal-600:#0D9488` | `primary-600` |
| `--teal-700:#0F766E` | `primary-700` |
| `--teal-800:#115E59` | `primary-800` |
| `--cream-100:#FFFBF0` | `cream-100` |
| `--cream-200:#FFF7E0` | `cream-200` |
| `--border:#E7E5E4` | `stone-200` |
| `--ink:#292524` | `stone-800` |
| `--ink-soft:#57534E` | `stone-600` |
| `--ink-faint:#78716C` | `stone-500` |
| `--red:#DC2626` | `red-600` |
| `--white:#FFFFFF` | `white` |

Polices : Figtree (headings, `font-heading`) + Noto Sans (body, `font-body`) — déjà configurées.

## Structure maquette

### Desktop (≥861px) — split 50/50
- **Panel gauche** (brand) : fond gradient `from-primary-800 to-primary-600`, padding 44px 52px
  - Blobs décoratifs (cercles `bg-white/8`)
  - Logo : icône heartbeat + "Dr Guinane Aicha" lien vers `/fr`
  - Texte : "La santé de vos enfants, entre de bonnes mains"
  - 3 points avec icônes check :
    1. Dossier patient centralisé
    2. Agenda synchronisé avec le site
    3. Carnet vaccinal & courbes de croissance
  - Footer : "Pédiatre · Inezgane, Souss-Massa"

- **Panel droit** (form) : fond `cream-100`, centré verticalement
  - Lien "Retour au site" avec flèche ←
  - Heading "Espace Praticien"
  - Sous-titre "Connectez-vous pour accéder à votre cabinet"
  - Champ Email (placeholder "votre@email.com")
  - Champ Password (placeholder "••••••••") avec bouton œil toggle
  - Lien "Mot de passe oublié ?" aligné à droite
  - Bouton "Se connecter" plein largeur `bg-primary-700` hover `bg-primary-800`
  - Footer "© 2026 Dr Guinane Aicha"

### Mobile (<861px) — single column
- Brand panel réduit : logo + icône seulement (barre horizontale en haut)
- Form panel prend toute la largeur

## États

### Loading
Bouton "Se connecter" → spinner (`.spinner` CSS : border animation) + label masqué.
Classe `.loading` sur le bouton.

### Error
`div.form-error` caché par défaut, affiché via classe `.show`.
Style : fond `bg-red-50`, bordure `border-red-200`, texte `text-red-600`, icône alert.

## Comportement

1. Submit → POST `/api/auth/login` avec JSON `{ email, password }`
2. Si 200 → `router.push('/dashboard')` (from `@/i18n/navigation`)
3. Si erreur → afficher `form-error` avec message
4. Eye toggle → change `password` → `text` et icône eye/eyeoff

## Fichiers

### À modifier
- `apps/frontend/src/app/[locale]/login/page.tsx` — remplacer par nouveau design (client component). **Tous les textes en dur en français.**

### À ne PAS toucher
- `apps/frontend/messages/*.json` — **aucune clé i18n à ajouter.** Le login est FR-only.
- `apps/frontend/src/app/api/auth/login/route.ts` — l'API est conservée telle quelle

## Règles
1. Aucune déviation visuelle par rapport à la maquette HTML
2. Icônes : utiliser Lucide React (Heart, Check, ArrowLeft, Eye, EyeOff, AlertCircle, ArrowRight)
3. Tokens MASTER.md v1.2 UNIQUEMENT (pas de `ink-*`, `border-warm`, `shadow-warm-*`)
4. **Texte en dur en français** — pas de `useTranslations()`, pas de `next-intl`. L'espace praticien (login + dashboard) est **FR-only** par décision produit. Seul le site vitrine publique utilise i18n.
5. **Pas de props RTL** — pas de `ms-*`/`me-*`. Le login est LTR uniquement.
6. Responsive : breakpoint `md` (768px) pour le collapse
