# Issue : Onboarding self-service (vitrine + rdv), demande de contact (dossier + clinique)

## Contexte

- L'API onboarding (`POST /api/onboarding`) existe déjà et est fonctionnelle — elle crée un `Tenant`, un `User` (tenant_admin + doctor), un client Invoice Ninja, et une facture d'abonnement.
- Mais il n'y a **aucune page frontend** pour utiliser cet endpoint. L'onboarding est actuellement 100% assisté (appel API manuel).
- La stratégie retenue : **séparer le self-service des tiers**. `vitrine` (gratuit) et `rdv` (149 MAD/mois) → création immédiate en self-service. `dossier` (299 MAD/mois) et `clinique` (499 MAD/mois) → demande de contact/démo (ces tiers donnent accès au dashboard praticien avec données patient, donc validation humaine requise avant activation).

## Données existantes

- **Endpoint** : `POST /api/onboarding` accepte `{ domain, name, email, password, tier, phone?, eventSlug?, username?, customUrl? }`
- **Tiers** : `vitrine` (gratuit), `rdv` (149 MAD), `dossier` (299 MAD), `clinique` (499 MAD)
- **Invoice Ninja** : intégré mais dégrade gracieusement si env vars absentes — pas besoin de le modifier
- **Dashboard layout** (`(dashboard)/layout.tsx`) bloque déjà l'accès aux tiers `vitrine` et `rdv` — redirige vers `/`. Donc pas de risque qu'un onboarding vitrine/rdv accède au dashboard.

---

## Travail à faire

### 1. Variable d'environnement (prérequis Driss)

Ajouter dans l'environnement Vercel + `.env.local` :

```
NEXT_PUBLIC_ONBOARDING_BASE_DOMAIN=.dr-tabibi.ma
```

> Note : `NEXT_PUBLIC_*` car le préfixe de domaine est affiché côté client. La valeur réelle sera décidée au moment du déploiement (ex: `.dr-tabibi.ma`, `.drixou.uk`, etc.).

### 2. Page onboarding

**Fichier à créer** : `apps/frontend/src/app/[locale]/onboarding/page.tsx`

Route publique. Contenu :

```tsx
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:py-24">
      <OnboardingFlow />
    </div>
  )
}
```

### 3. Composant OnboardingFlow

**Fichier à créer** : `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`

Composant client (`'use client'`) — wizard 3 étapes :

```
┌──────────────────────────────────────────────────────────┐
│                   🔵 Étape 1 : Choisir votre formule      │
│                                                          │
│   [Vitrine]     [RDV]         [Dossier]      [Clinique]  │
│   Gratuit       149 MAD/mois   299 MAD/mois   499 MAD     │
│   ✓ Site        ✓ Site        ✓ Site        ✓ Tout       │
│   ✓ Branding    ✓ RDV Cal.com ✓ RDV         ✓ Dossier    │
│                 ✓ Branding    ✓ Patients    ✓ Ordo       │
│                                ✓ Branding    ✓ Certificats│
│                                              ✓ Branding   │
│   [Commencer]   [Commencer]   [Nous contacter] [Contacter]│
│                                                          │
│   (vitrine/rdv → étape 2, dossier/clinique → contact)    │
└──────────────────────────────────────────────────────────┘
```

#### Étape 1 : Choix du tier

- 4 cartes en grille responsive (1 colonne sur mobile, 2 sur tablette, 4 sur desktop)
- Chaque carte contient :
  - Nom du tier en titre (`font-heading text-lg font-bold`)
  - Prix en gros (`text-3xl font-bold text-primary-700`) + "/mois"
  - Badge "Gratuit" pour vitrine (vert)
  - Liste des features avec icônes ✓ (`Check` de lucide-react)
  - Bouton en bas :
    - vitrine/rdv : "Commencer" (`bg-primary-700 text-white hover:bg-primary-800`)
    - dossier/clinique : "Nous contacter" (`border border-primary-200 text-primary-700 hover:bg-primary-50`)
- Carte active : bordure `border-primary-500 ring-2 ring-primary-500/20`
- Détail des features par tier :

| Tier | Features affichées |
|------|-------------------|
| vitrine | Site vitrine personnalisé, 4 langues (fr/en/ar/tzm), Design responsive, Hébergement inclus, Nom de domaine personnalisé |
| rdv | Tout vitrine + Prise de rendez-vous en ligne (Cal.com), Agenda synchronisé, Notifications automatiques |
| dossier | Tout rdv + Dossier patient numérique, File d'attente, Consultation + ordonnance, Carnet vaccinal, Courbes de croissance |
| clinique | Tout dossier + Multi-praticiens, Registre d'audit, Statistiques avancées, Support prioritaire |

#### Étape 2 : Formulaire d'inscription

Affiché uniquement si tier sélectionné = `vitrine` ou `rdv`.

Champs :

```
Nom du cabinet *      [___________________________]
Votre nom *           [___________________________]
Email *               [___________________________]
Mot de passe *        [___________________________]
Sous-domaine *        [________________] .dr-tabibi.ma
Téléphone             [___________________________] (optionnel)

─── Cal.com (uniquement si tier = rdv) ───
Slug événement        [___________________________] (ex: consultation-pediatrique)
Nom d'utilisateur     [___________________________] (ex: dr-martin)
URL instance          [___________________________] (optionnel)
```

- Validation côté client :
  - Tous les champs obligatoires remplis
  - Email valide (regex basique)
  - Password ≥ 8 caractères
  - Sous-domaine ≥ 3 caractères, alphanumérique + tirets uniquement
- Bouton "Créer mon compte" + loader pendant la soumission
- Appel `POST /api/onboarding` avec :
  ```json
  {
    "domain": "mon-sous-domaine.dr-tabibi.ma",
    "name": "Cabinet Dr Martin",
    "email": "dr.martin@email.com",
    "password": "...",
    "tier": "rdv",
    "phone": "+212...",
    "eventSlug": "consultation-pediatrique",
    "username": "dr-martin",
    "customUrl": "https://calcom.drixou.uk"
  }
  ```
- Gestion d'erreur : afficher l'erreur retournée par l'API (ex: "Ce domaine est déjà utilisé")
- Succès : passer à l'étape 3

#### Étape 3 : Confirmation

Pour vitrine/rdv (succès) :
```
✅ Votre cabinet est prêt !

Votre site est accessible à l'adresse :
🔗 https://mon-sous-domaine.dr-tabibi.ma

Connectez-vous à votre espace :
[Accéder à mon espace] → lien vers /login

Prochaines étapes :
1. Personnalisez votre site vitrine depuis votre espace
2. Ajoutez vos informations de contact, horaires, services
3. (rdv) Configurez vos disponibilités dans Cal.com
```

Pour dossier/clinique (contact) :
```
📋 Demande envoyée

Merci pour votre intérêt ! Nous vous contacterons dans les 48h
pour organiser une démo et configurer votre espace.

En attendant, vous pouvez nous écrire à : contact@dr-tabibi.ma
```

#### Navigation

- Barre de progression en haut (3 étapes numérotées avec labels : "Formule" → "Inscription" → "Confirmation")
- Étape courante en `text-primary-700 font-bold`, étapes futures en `text-stone-400`
- Bouton "Retour" sur les étapes 2 et 3 (retour à l'étape précédente)
- Le tier sélectionné est résumé en haut de l'étape 2 (badge avec nom du tier + prix)

### 4. Séparation des tiers en composants

Pour ne pas avoir un seul énorme composant :

**Fichier à créer** : `apps/frontend/src/components/onboarding/TierCard.tsx`

Props : `{ slug, name, price, features, badge?, ctaLabel, ctaVariant, onClick }`

```tsx
<div className={`rounded-xl border-2 p-6 transition-all duration-200 ${isActive ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-stone-200 hover:border-stone-300'}`}>
  {/* badge gratuit si price=0 */}
  {/* nom du tier */}
  {/* prix */}
  {/* liste features avec icône Check */}
  {/* bouton CTA */}
</div>
```

**Fichier à créer** : `apps/frontend/src/components/onboarding/SignupForm.tsx`

Props : `{ tier: 'vitrine' | 'rdv', onSuccess: (data) => void, onBack: () => void }`

Gère le formulaire, l'appel API, la validation, les erreurs.

**Fichier à créer** : `apps/frontend/src/components/onboarding/StepIndicator.tsx`

Props : `{ steps: { label: string }[], current: number }`

Barre de progression visuelle (numéros + labels + connecteurs).

### 5. Responsive

- Grille tier : 1 col mobile, 2 col tablette, 4 col desktop
- Formulaire : pleine largeur mobile, max-w-lg centré tablette+
- Polices et espacements cohérents avec le design system
- Padding adapté mobile (px-4, py-8)

### 6. i18n

L'onboarding est FR-only comme le reste de l'espace praticien. Pas de fichiers i18n à modifier.

### 7. Messages d'erreur API soignés

L'API onboarding retourne `{ error: string, detail?: any }`. Le formulaire doit :
- Afficher l'erreur lisiblement (pas de JSON brut)
- Messages compréhensibles :
  - "Ce domaine est déjà utilisé" → "Ce nom de domaine est déjà pris. Choisissez-en un autre."
  - "Erreur création tenant" → "Une erreur est survenue lors de la création de votre cabinet. Veuillez réessayer."
  - Timeout réseau → "Impossible de contacter le serveur. Vérifiez votre connexion."

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/app/[locale]/onboarding/page.tsx` | Page serveur publique |
| `apps/frontend/src/components/onboarding/OnboardingFlow.tsx` | Wizard client 3 étapes |
| `apps/frontend/src/components/onboarding/TierCard.tsx` | Carte de tier |
| `apps/frontend/src/components/onboarding/SignupForm.tsx` | Formulaire d'inscription |
| `apps/frontend/src/components/onboarding/StepIndicator.tsx` | Barre de progression |

## Fichiers à modifier

Aucun. L'API onboarding existante est utilisée telle quelle.

---

## Règles obligatoires

1. **Design system** : tokens sémantiques uniquement (`primary-*`, `stone-*`, `cream-*`, `success`, `warning`, `error`). Pas de couleurs Tailwind brutes.
2. **Pas de `any`** sans justification.
3. **`'use client'`** uniquement sur les composants qui en ont besoin (OnboardingFlow, TierCard, SignupForm, StepIndicator).
4. **Validation** : le formulaire doit valider côté client AVANT l'appel API (email format, password longueur, sous-domaine alphanumérique). 
5. **Accessibilité** : labels sur tous les inputs, focus visible, aria-disabled sur boutons pendant chargement.
6. **Sécurité** : le mot de passe est envoyé en clair dans le corps de la requête POST (comme c'est déjà le cas dans l'API onboarding). C'est acceptable car l'API est en HTTPS — mais le formulaire doit utiliser `<input type="password">` pour le champ mot de passe.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

Aucun commit si le build échoue.

---

## Ordre d'implémentation

1. `StepIndicator.tsx` (isolé, pas de dépendances)
2. `TierCard.tsx` (isolé)
3. `SignupForm.tsx` (dépend de l'API onboarding)
4. `OnboardingFlow.tsx` (assemble tout)
5. `/onboarding/page.tsx` (page serveur wrapper)
6. Build gate
