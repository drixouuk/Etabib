# PROMPT FLASH — SX9 : Horaires unifiés + Équipe + Simulateur démo

> **Règle :** Phase par phase. Après chaque phase, `pnpm build` dans `apps/frontend`. Résoudre toute erreur avant de passer à la suivante. Ne pas casser l'existant. Design system : `design-system/MASTER.md`.

---

## Phase 1 — Horaires/Créneaux unifiés + fermetures exceptionnelles

### État actuel
- `ScheduleEditor.tsx` — Horaires d'ouverture (page vitrine). Stocke dans `practice-info.schedules` : `{ day: string, open: string, close: string }[]`. Affiché sur la page vitrine publique.
- `AvailabilityManager.tsx` — Créneaux de réservation (booking). Stocke dans `availability-slots` : `{ dayOfWeek, startTime, endTime, durationMinutes, bufferMinutes, isActive }`. Utilisé par le système de réservation.
- Les deux sont indépendants, le médecin saisit deux fois la même chose.

### Cible
1. Le médecin remplit UNIQUEMENT les **horaires d'ouverture** dans `ScheduleEditor`.
2. Les créneaux de réservation sont **auto-générés** à partir des horaires et affichés en **lecture seule grisée** en dessous.
3. Un toggle `"Créneaux de réservation différents des horaires"` permet de **désynchroniser** et d'éditer les créneaux indépendamment.
4. Ajout de **fermetures exceptionnelles** (jours fériés, vacances) visibles sur la page vitrine.

### Implémentation

#### 1.1 Ajouter un flag dans le CMS

**Fichier :** `apps/cms/src/collections/Tenants.ts`

Ajouter dans le groupe `settings` :
```ts
{
  name: 'customSlots',
  type: 'checkbox',
  defaultValue: false,
  label: 'Créneaux de réservation différents des horaires',
  admin: { description: 'Si coché, le médecin peut éditer les créneaux indépendamment des horaires.' },
}
```

Créer la migration (`npx payload migrate:create`), commit.

#### 1.2 Refondre `ScheduleEditor.tsx`

**Fichier :** `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ScheduleEditor.tsx`

Le composant devient **ScheduleAndSlots.tsx** (renommer le fichier). Il contient :

```
┌─ Horaires d'ouverture · page vitrine ─────────────┐
│  Lun [08:00] → [12:00]  [✕]                       │
│  Lun [14:00] → [18:00]  [✕]                       │
│  Mar [08:00] → [12:00]  [✕]                       │
│  [+ Ajouter]                    [Enregistrer]      │
├────────────────────────────────────────────────────┤
│ ☐ Créneaux de réservation différents des horaires  │
├─ Créneaux de réservation ───────────────────────── │
│  Lun 08:00–12:00 · 30min · pause 15min  [grisé]   │
│  Lun 14:00–18:00 · 30min · pause 15min  [grisé]   │
│  ...                                               │
└────────────────────────────────────────────────────┘
```

**Logique :**
- Au chargement, fetch `practice-info.schedules` + `availability-slots` + `tenant.settings.customSlots`.
- Si `customSlots === false` : les créneaux sont dérivés des horaires en lecture seule (pas de boutons Ajouter/Éditer/Supprimer).
  - Règle de dérivation : pour chaque entrée horaire `{ day: 'Lundi', open: '08:00', close: '12:00' }` → créer un slot `{ dayOfWeek: '1', startTime: '08:00', endTime: '12:00', durationMinutes: 30, bufferMinutes: 15, isActive: true }`.
  - Quand l'utilisateur modifie les horaires et clique Enregistrer → sauvegarder les horaires + régénérer les créneaux (DELETE tous les anciens, POST les nouveaux).
- Si `customSlots === true` : basculer le composant `AvailabilityManager` en mode éditable. Les créneaux sont gérés indépendamment.

**Supprimer `AvailabilityManager` en tant que composant séparé** (ses fonctions sont absorbées dans `ScheduleAndSlots`). Le fichier `AvailabilityManager.tsx` peut être supprimé.

Mettre à jour `SettingsTabsContent.tsx` : remplacer `<ScheduleEditor />` et `<AvailabilityManager />` par `<ScheduleAndSlots />`.

#### 1.3 Ajouter les fermetures exceptionnelles

Dans `ScheduleAndSlots.tsx`, ajouter une sous-section après les horaires :

```
┌─ Fermetures exceptionnelles ───────────────────────┐
│  Du [01/08/2026] au [15/08/2026] · Congés annuels  │
│  Le [14/07/2026] · Jour férié                       │
│  [+ Ajouter]                                        │
└─────────────────────────────────────────────────────┘
```

**Stockage :** Ajouter un champ `exceptionalClosures` au `practice-info` dans le CMS :

```ts
// apps/cms/src/collections/PracticeInfo.ts
{
  name: 'exceptionalClosures',
  type: 'array',
  label: 'Fermetures exceptionnelles',
  fields: [
    { name: 'startDate', type: 'date', required: true },
    { name: 'endDate', type: 'date' },
    { name: 'label', type: 'text', required: true },
  ],
}
```

Créer la migration. Ces fermetures s'affichent sur la page vitrine publique (dans `InfosSection.tsx` ou similaire) sous les horaires normaux.

---

## Phase 2 — Gestion de l'équipe (création/suppression comptes)

### État actuel
`ManageAccounts.tsx` liste les utilisateurs et permet de réinitialiser leur mot de passe. Pas de création ni suppression.

### Cible
- **Ajouter un compte** secrétaire ou remplaçant
- **Supprimer** un compte (sauf le sien)
- **Réinitialiser le mot de passe** (déjà existant)
- Pour les remplaçants : définir la **date d'expiration**

### Implémentation

#### 2.1 Refondre `ManageAccounts.tsx`

**Fichier :** `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ManageAccounts.tsx`

Ajouter en haut un bouton `"+ Ajouter un compte"` qui ouvre un formulaire modal/inline :

```
┌─ Ajouter un compte ───────────────────────────────┐
│  Nom complet : [_______________]                    │
│  Email : [_______________]                          │
│  Rôle : [Secrétaire ▾]  (ou Remplaçant)            │
│  [si Remplaçant] Date d'expiration : [__/__/____] │
│  Mot de passe temporaire : [_______________]        │
│  [Annuler]  [Créer le compte]                      │
└────────────────────────────────────────────────────┘
```

**Création :**
```ts
POST /api/cms-proxy/users
Body: { email, password, name, roles: ['secretary'], tenant: <tenantId> }
```
Pour un remplaçant : `roles: ['substitute']` + `accessExpiresAt: <date>`.

**Suppression :**
```ts
DELETE /api/cms-proxy/users/{id}
```
Avec `confirm('Supprimer ce compte ?')`. Ne pas permettre la suppression de soi-même.

**Mot de passe :** conserver le `ResetPasswordButton` existant (fonctionnel).

**Ajouter le fetch du `tenantId`** dans le composant pour pouvoir le passer au POST :
```ts
// Dans le useEffect ou via props
const tenantId = ... // depuis le fetch /api/cms-proxy/tenants
```

---

## Phase 3 — Simulateur de tier/rôle dans la démo (drdemo uniquement)

### Cible
Dans la sidebar, UNIQUEMENT pour le compte `drdemo@gmail.com` (domaine `drdemo.etabibi.ma`) :
- Un toggle pour switcher entre les 3 tiers (Vitrine, RDV, Cabinet) et voir le menu sidebar changer en temps réel
- Un toggle pour switcher la vue (Médecin / Secrétaire) et voir ce que la secrétaire verrait

### Implémentation

#### 3.1 Créer `DemoSimulator.tsx`

**Fichier :** `apps/frontend/src/components/dashboard/DemoSimulator.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Layers, Eye } from 'lucide-react'

type Props = {
  currentTier: string
  currentRoles: string[]
  onTierChange: (tier: string) => void
  onRoleToggle: () => void
  simulatedRole: 'doctor' | 'secretary'
}

export default function DemoSimulator({ currentTier, currentRoles, onTierChange, onRoleToggle, simulatedRole }: Props) {
  const tiers = ['vitrine', 'rdv', 'cabinet']
  const tierLabels: Record<string, string> = { vitrine: 'Vitrine', rdv: 'RDV', cabinet: 'Cabinet' }

  return (
    <div className="border-t border-primary-600/15 px-[10px] pt-3 mt-3">
      <p className="text-[10px] font-bold uppercase text-stone-400 tracking-wider mb-2">Simulateur démo</p>
      
      {/* Tier switcher */}
      <div className="flex items-center gap-1.5 mb-2">
        <Layers className="size-3 text-stone-400 shrink-0" />
        <select
          value={currentTier}
          onChange={e => onTierChange(e.target.value)}
          className="flex-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-700"
        >
          {tiers.map(t => (
            <option key={t} value={t}>{tierLabels[t]}</option>
          ))}
        </select>
      </div>

      {/* Role switcher */}
      <button
        onClick={onRoleToggle}
        className="flex items-center gap-1.5 w-full rounded-md px-2 py-1 text-[11px] text-stone-600 hover:bg-stone-100 transition-colors"
      >
        <Eye className="size-3 shrink-0" />
        Vue : {simulatedRole === 'doctor' ? 'Médecin' : 'Secrétaire'}
      </button>
    </div>
  )
}
```

#### 3.2 Intégrer dans `Sidebar.tsx`

**Fichier :** `apps/frontend/src/components/dashboard/Sidebar.tsx`

Ajouter un état local pour le simulateur :

```tsx
const isDemo = tenant?.domain?.startsWith('drdemo.')

const [simulatedTier, setSimulatedTier] = useState<string | null>(null)
const [simulatedRole, setSimulatedRole] = useState<'doctor' | 'secretary'>('doctor')

const effectiveTier = simulatedTier || tier
const effectiveRoles = simulatedRole === 'secretary'
  ? ['secretary']
  : user.roles
```

Utiliser `effectiveTier` pour la navigation (`tierNav`) — remplacer toutes les occurrences de `tier` par `effectiveTier`.

Utiliser `effectiveRoles` pour l'affichage du rôle dans le footer sidebar.

Ajouter le composant `DemoSimulator` en bas de la sidebar, AVANT le bloc utilisateur :

```tsx
{isDemo && (
  <DemoSimulator
    currentTier={simulatedTier || tier || 'vitrine'}
    currentRoles={effectiveRoles}
    onTierChange={setSimulatedTier}
    onRoleToggle={() => setSimulatedRole(s => s === 'doctor' ? 'secretary' : 'doctor')}
    simulatedRole={simulatedRole}
  />
)}
```

#### 3.3 Passer le `domain` dans le type `Tenant`

Vérifier que le type `Tenant` dans `lib/payload.ts` inclut bien `domain: string`. C'est déjà le cas (ligne 85 du fichier).

---

## Vérification finale

```bash
cd apps/frontend && pnpm build
cd apps/cms && pnpm build
```

### Fichiers créés/modifiés

| Phase | Créés | Modifiés | Supprimés |
|---|---|---|---|
| 1 | migration CMS (customSlots + exceptionalClosures) | `Tenants.ts`, `PracticeInfo.ts`, `ScheduleEditor.tsx` → `ScheduleAndSlots.tsx`, `SettingsTabsContent.tsx` | `AvailabilityManager.tsx` |
| 2 | — | `ManageAccounts.tsx` | — |
| 3 | `DemoSimulator.tsx` | `Sidebar.tsx` | — |

### Règles

1. Design system `MASTER.md` — tokens sémantiques, pas de couleurs brutes
2. Dashboard français uniquement (labels, placeholders)
3. Migration CMS obligatoire pour tout changement de schéma
4. Build gate après chaque phase
