# LOT SX-6 — Landing page dr-tabibi (maquette → code)

## Contexte

Créer la landing page marketing de **dr-tabibi** (la plateforme SaaS elle-même, pas la vitrine d'un médecin). Cette page présente le produit aux praticiens qui veulent s'inscrire. Elle est **indépendante** du système multi-tenant.

La maquette est dans `docs/Maquette/dr-tabibi-landing.html`. **Zéro déviation visuelle**, sauf les incohérences listées ci-dessous.

## Routing

**Fichier à créer** : `apps/frontend/src/app/[locale]/landing/page.tsx`

La landing page est accessible à `/[locale]/landing` (ex: `/fr/landing`, `/ar/landing`). Elle est **multilingue** (fr/en/ar/tzm), comme le reste du site public.

## Incohérences à corriger par rapport à la maquette

| Ligne maquette | Texte original | Remplacer par | Raison |
|---|---|---|---|
| 500 | RDV en ligne via Cal.com | RDV en ligne intégré | Cal.com supprimé (SX-1) |
| 547 | propulsé par Cal.com | (supprimer cette mention) | Cal.com supprimé |
| 680 | Prise de rendez-vous en ligne (Cal.com) | Prise de rendez-vous en ligne | Cal.com supprimé |

Aucune autre incohérence détectée.

## Design token mapping (maquette → projet)

| Maquette | Token projet / Tailwind |
|----------|------------------------|
| `--cream: #FFFBF0` | `cream-100` |
| `--teal: #0D9488` | `primary-600` |
| `--teal-dark: #0B6E64` | `primary-700` |
| `--teal-tint: #E4F4F1` | `primary-50` |
| `--amber: #F59E0B` | `secondary-500` |
| `--amber-tint: #FDF0D5` | `amber-50` |
| `--orange: #EA580C` | `cta-500` |
| `--orange-dark: #C8480A` | `cta-600` |
| `--ink: #2A241C` | `text-[#2A241C]` |
| `--ink-soft: #8A8175` | `text-[#8A8175]` |
| `--ink-faint: #B9B2A4` | `text-[#B9B2A4]` |
| `--border: rgba(42,36,28,.10)` | `border-stone-200/50` |
| `--shadow-sm/md/lg` | `shadow-sm/md/lg` |
| `--radius-sm: 12px` | `rounded-xl` |
| `--radius-md: 20px` | `rounded-2xl` |
| `--radius-lg: 28px` | `rounded-3xl` |

---

## Structure de la page

### 1. Header (floating navbar) — maquette lignes 403-424

- Logo "dr-tabibi" avec l'icône heartbeat
- Liens : Fonctionnalités, Démo, Tarifs, FAQ (ancres internes)
- Bouton "Essayer la démo" → lien vers `https://demo.drixou.uk/login`
- Mobile : hamburger avec menu déroulant
- Comportement scroll : se cache au scroll down, réapparaît au scroll up (réutiliser le hook `useScrollDirection` existant)

### 2. Hero — maquette lignes 428-493

- Blobs décoratifs (teal gauche, amber droite, flou 70px, opacité .35)
- Badge "Pensé pour les praticiens indépendants au Maroc"
- Titre : "Le cabinet médical, simplifié au quotidien"
- Sous-titre : 4 langues, RDV en ligne, dossier patient
- 2 CTA : "Essayer la démo gratuite" (primaire) + "Voir les tarifs" (secondaire)
- Trust : "Sans engagement", "Hébergement inclus", "Support en français"
- **Carte clinique** (élément signature) :
  - Avatar gradient amber→orange, nom patient fictif "Yasmine · 18 mois"
  - Badge "Aujourd'hui" + "Suivi OMS intégré" flottant
  - Mini graphique de croissance (SVG inline) avec animation au chargement
  - Courbes p3/p50/p97 + ligne patient orange + légende

### 3. Trust bar — maquette lignes 496-503

- 4 items avec icônes : Hébergement sécurisé, 4 langues, RDV en ligne intégré, Conforme loi 09-08

### 4. Problem / Solution — maquette lignes 505-528

- Eyebrow "Le constat"
- 3 cartes avec avant/après (point gris → check teal)
- Grid 3 colonnes

### 5. Features — maquette lignes 530-582

- Eyebrow "Fonctionnalités"
- Grid 4 colonnes, 8 cartes avec icônes
- Carte "Courbes de croissance OMS" a un badge "Exclusif" (amber)

### 6. How it works — maquette lignes 584-610

- Eyebrow "Mise en route"
- 3 étapes numérotées avec ligne pointillée de connexion
- Grid 3 colonnes

### 7. Demo — maquette lignes 612-648

- Eyebrow "Sans inscription"
- 2 colonnes : texte à gauche, carte visuelle à droite
- Credentials (email + mot de passe) avec boutons "Copier"
- Bouton "Accéder à la démo" → `https://demo.drixou.uk/login`

### 8. Pricing — maquette lignes 650-709

- Eyebrow "Tarifs"
- 3 cartes : Vitrine (Gratuit), RDV (199 MAD/mois), Cabinet (499 MAD/mois)
- Cabinet a un badge "Le plus complet" (ribbon) et est mis en avant (bordure teal)
- Chaque carte a un bouton CTA vers `/onboarding`

### 9. Security — maquette lignes 711-742

- 4 items avec icônes
- Citation "Déjà utilisé en conditions réelles par un cabinet de pédiatrie à Inezgane"

### 10. FAQ — maquette lignes 744-778

- 6 questions en `<details>` / `<summary>`
- Icône chevron qui tourne quand ouvert

### 11. Final CTA — maquette lignes 780-790

- Fond gradient teal-dark → teal
- Texte blanc + 2 boutons (blanc + outline blanc)
- Overlay décoratif (cercle blanc semi-transparent)

### 12. Footer — maquette lignes 794-827

- Grid 4 colonnes : brand + Produit + Support + Légal
- Bottom bar : copyright + "Fait au Maroc"

---

## Comportements JS

### Scroll reveal
Toutes les sections (sauf hero et trust bar) utilisent `.reveal` : `opacity:0; transform:translateY(22px)` → `opacity:1; transform:none` avec `IntersectionObserver` (threshold 0.15).

### Hero chart animation
Au chargement de la page (délai 350ms) :
1. La ligne de croissance s'anime (`stroke-dashoffset` → 0, durée 1.6s)
2. Les points apparaissent séquentiellement (délai croissant × 380ms)
3. Le callout "50ᵉ percentile" apparaît après 1.7s

### Copy to clipboard
Les boutons "Copier" utilisent `navigator.clipboard.writeText()`. Feedback visuel : le texte du bouton devient "Copié" pendant 1.6s.

### Mobile nav toggle
Comportement identique à `Header.tsx` existant.

### Floating navbar
Identique au `useScrollDirection` déjà utilisé dans `Header.tsx`.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/app/[locale]/landing/page.tsx` | Landing page (client component, multilingue) |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/messages/fr.json` | Ajouter namespace `landing` |
| `apps/frontend/messages/en.json` | Ajouter namespace `landing` |
| `apps/frontend/messages/ar.json` | Ajouter namespace `landing` |
| `apps/frontend/messages/tzm.json` | Ajouter namespace `landing` |

---

## Règles obligatoires

1. **Maquette = source unique de vérité** pour les couleurs, espacements, typographie.
2. **Multilingue** : utiliser `useTranslations('landing')` avec les clés i18n dans `messages/*.json` (fr/en/ar/tzm). Tous les textes visibles doivent passer par les traductions.
3. **RTL** : la locale `ar` doit supporter l'affichage RTL. Utiliser les propriétés logiques (`ms-*`/`me-*`) pour les marges/paddings.
4. **Icônes Lucide** pour les icônes simples (check, arrow, copy, menu, close, globe, lock, shield, etc.). Pour les icônes plus spécifiques (heartbeat, trend, bars, file, calendar, users), utiliser les SVG inline de la maquette ou chercher l'équivalent Lucide le plus proche.
5. **Polices** : Figtree (headings) + Noto Sans (body) — déjà disponibles.
6. **Pas de `any`** sans justification.
7. **Liens externes** : `https://demo.drixou.uk/login` pour la démo, `/onboarding` pour l'inscription.
8. **Cal.com** : supprimer les 3 mentions identifiées ci-dessus.
9. **Animation hero chart** : l'implémenter avec des classes CSS + `useEffect` (pas de librairie d'animation).

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```
