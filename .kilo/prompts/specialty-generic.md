# Issue : Dossier générique par spécialité

## Contexte

- Le produit est aujourd'hui pédiatrie-only : `Vaccinations`, `VaccineSchedule`, `GrowthChart`, `perimetreCranien` sont des concepts pédiatriques affichés en dur sur la fiche patient, quel que soit le tenant.
- Pour vendre à un 2ᵉ client d'une autre spécialité (généraliste, gynéco...), il faut rendre ces modules **conditionnels** et ajouter un choix de spécialité structuré.
- `Doctors.specialty` existe déjà mais en texte libre — non structurant (aucune logique applicative n'en dépend).
- `Consultations` a déjà des champs génériques (`motif`, `examenClinique`, `diagnostic`) et un champ pédiatrique (`perimetreCranien`).
- Le carnet vaccinal et les courbes de croissance sont câblés en dur sur la fiche patient (lignes 157-169 de `patients/[id]/page.tsx`).
- **On ne construit pas de formulaire de consultation personnalisable par spécialité.** On conditionne juste l'affichage de modules prédéfinis.

---

## Travail à faire

### 1. CMS — Ajouter `specialty` dans `tenant.settings`

**Fichier** : `apps/cms/src/collections/Tenants.ts`

Dans le groupe `settings` (après `activeTier`), ajouter :

```ts
{
  name: 'specialty',
  type: 'select',
  options: ['pediatrie', 'generaliste', 'gynecologie', 'dermatologie', 'autre'],
  defaultValue: 'generaliste',
  label: 'Spécialité du cabinet',
  admin: { description: 'Détermine les modules cliniques affichés dans le dossier patient' },
},
```

- `pediatrie` = active les courbes de croissance, carnet vaccinal, périmètre crânien
- `generaliste` = modules génériques uniquement
- Les autres valeurs (`gynecologie`, `dermatologie`, `autre`) se comportent comme `generaliste` pour l'instant — pas de modules spécifiques
- La valeur par défaut est `generaliste` (nouveaux tenants non-pédiatres)

**IMPORTANT** : après modification de la collection, générer la migration :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 2. Frontend — Mettre à jour le type `Tenant`

**Fichier** : `apps/frontend/src/lib/payload.ts`

Dans le type `Tenant.settings`, ajouter `specialty: string` :

```ts
export type Tenant = {
  id: string
  name: string
  domain: string
  settings: {
    defaultLocale: string
    activeTier: string
    specialty: string  // ← ajouter
  }
  calcomSettings: CalComSettings | null
}
```

### 3. Onboarding API — Accepter `specialty`

**Fichier** : `apps/frontend/src/app/api/onboarding/route.ts`

**Ligne 22** : extraire `specialty` du body :
```ts
const { domain, name, email, password, tier = 'vitrine', phone, specialty } = body
```

**Lignes 39-44** : passer `specialty` dans `settings` (avec fallback `generaliste`) :
```ts
const tenantRes = await cmsPost('/tenants', {
  name,
  domain,
  settings: { defaultLocale: 'fr', activeTier: tier, specialty: specialty || 'generaliste' },
  // ...
})
```

### 4. Onboarding UI — Ajouter le choix de spécialité

**Fichier** : `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`

Actuellement, l'onboarding self-service ne concerne que `vitrine` et `rdv`. Le choix de spécialité est pertinent uniquement pour `dossier` et `clinique` (les seuls à avoir un dashboard avec dossier patient).

**Modification** : changer le comportement des tiers `dossier` et `clinique` :
- Au lieu d'aller directement à l'étape "contact", afficher un **mini-formulaire** avec juste le choix de spécialité + un champ message optionnel
- Ce formulaire appelle un endpoint (ou simplement affiche la confirmation) — pour l'instant, on garde le comportement "contact" pour dossier/clinique (pas d'inscription immédiate), mais on collecte la spécialité

Approche plus simple : ajouter un sélecteur de spécialité dans l'étape 1 (choix du tier), visible uniquement quand le tier sélectionné est `dossier` ou `clinique`. Afficher sous les cartes :

```
┌──────────────────────────────────────────────────────────┐
│ Choisissez votre formule                                  │
│                                                          │
│ [Vitrine]     [RDV]         [Dossier]      [Clinique]    │
│                                                          │
│ ▼ Spécialité : [Pédiatrie ▾]   (visible si dossier/clinique)
│                                                          │
│ [Commencer]  [Commencer]    [Nous contacter] [Contacter] │
└──────────────────────────────────────────────────────────┘
```

Ajouter en dessous de la grille des tiers (dans l'étape 0) :

```tsx
{selectedTier && (selectedTier === 'dossier' || selectedTier === 'clinique') && (
  <div className="mt-6 mx-auto max-w-xs">
    <label className="mb-1 block text-sm font-medium text-stone-700">Spécialité</label>
    <select
      value={selectedSpecialty}
      onChange={(e) => setSelectedSpecialty(e.target.value)}
      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
    >
      <option value="pediatrie">Pédiatrie</option>
      <option value="generaliste">Médecine générale</option>
      <option value="gynecologie">Gynécologie</option>
      <option value="dermatologie">Dermatologie</option>
      <option value="autre">Autre</option>
    </select>
  </div>
)}
```

Ajouter un état `const [selectedSpecialty, setSelectedSpecialty] = useState('generaliste')`.

**Fichier** : `apps/frontend/src/components/onboarding/SignupForm.tsx`

Ajouter la prop `specialty` et la passer dans le body de l'appel API :

```tsx
type Props = {
  tier: 'vitrine' | 'rdv'
  specialty?: string  // ← ajouter
  onSuccess: (data: { domain: string; email: string }) => void
  onBack: () => void
}
```

Dans `handleSubmit`, ajouter `specialty` au body si présent :
```ts
if (specialty) body.specialty = specialty
```

**Fichier** : `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`

Passer `selectedSpecialty` au `SignupForm` :
```tsx
<SignupForm
  tier={selected.slug as 'vitrine' | 'rdv'}
  specialty={selectedSpecialty}
  onSuccess={handleSignupSuccess}
  onBack={() => setStep(0)}
/>
```

### 5. Fiche patient — Conditionner les modules pédiatriques

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

Il faut récupérer la spécialité du tenant. Actuellement, la page appelle `requireAuth()` mais pas `getTenantById()`. Ajouter l'appel :

```tsx
import { getTenantById } from '@/lib/payload'

// Dans le composant :
const tenantId = typeof user.tenant === 'object' ? (user.tenant as any).id : user.tenant
const tenant = tenantId ? await getTenantById(tenantId) : null
const isPediatrie = tenant?.settings?.specialty === 'pediatrie'
```

Puis conditionner l'affichage :

```tsx
{/* GrowthChart — pédiatrie uniquement */}
{canViewClinical && isPediatrie && (
  <GrowthChart consultations={consultations} />
)}

{/* VaccinationRecord — pédiatrie uniquement */}
{canViewClinical && isPediatrie && (
  <VaccinationRecord ... />
)}
```

**Important** : les données `vaccineSchedule` et `patientVaccinations` ne doivent pas être fetchées si `!isPediatrie`. Déplacer les fetchs dans un bloc conditionnel :

```tsx
const [patient, consultationsData, prescriptionsData, documentsData, scheduleData, vaccinationsData] = await Promise.all([
  fetchCMS<Patient>(`/api/patients/${id}`, { revalidate: 0 }),
  // ... consultations, prescriptions, documents — TOUJOURS fetchés
  canViewClinical && isPediatrie
    ? fetchCMS<{ docs: VaccineScheduleEntry[] }>('/api/vaccine-schedule?sort=ageMonths&limit=100&depth=0', { revalidate: 60 })
    : Promise.resolve(null),
  canViewClinical && isPediatrie
    ? fetchCMS<{ docs: VaccinationData[] }>(`/api/vaccinations?where[patient][equals]=${id}&depth=0&limit=100`, { revalidate: 0 })
    : Promise.resolve(null),
])
```

### 6. ConsultationForm — Conditionner `perimetreCranien`

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx`

Le champ `perimetreCranien` (périmètre crânien) est pédiatrique. Ajouter une prop `isPediatrie` :

```tsx
type Props = {
  patientId: string
  consultations: Consultation[]
  isPediatrie?: boolean  // ← ajouter
}
```

Conditionner l'affichage du champ :

```tsx
{isPediatrie && (
  <div>
    <label className="mb-1 block text-sm font-medium text-stone-700">PC (cm)</label>
    <input type="number" step="0.1" value={perimetreCranien} onChange={e => setPerimetreCranien(e.target.value)} className={inputClass} />
  </div>
)}
```

Et adapter la `<div>` parente : `grid-cols-2` au lieu de `grid-cols-3` quand `!isPediatrie` :
```tsx
<div className={`grid gap-4 ${isPediatrie ? 'grid-cols-3' : 'grid-cols-2'}`}>
```

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

Passer `isPediatrie` au `ConsultationForm` :
```tsx
<ConsultationForm patientId={patient.id} consultations={consultations} isPediatrie={isPediatrie} />
```

### 7. Dashboard — Conditionner le widget rappels vaccinaux

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/page.tsx`

Actuellement, `VaccinationAlerts` est toujours rendu (dans la grille 2-col avec `QueuePreview`). Conditionner :

```tsx
// Récupérer la spécialité
const tenantId = typeof user.tenant === 'object' ? (user.tenant as any).id : user.tenant
const tenant = tenantId ? await getTenantById(tenantId) : null
const isPediatrie = tenant?.settings?.specialty === 'pediatrie'
```

Puis :
```tsx
<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
  <QueuePreview />
  {isPediatrie ? (
    <VaccinationAlerts />
  ) : (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="font-heading text-base font-semibold text-stone-800">Prochain rendez-vous</h3>
      <p className="mt-2 text-sm text-stone-400">Fonctionnalité à venir</p>
    </div>
  )}
</div>
```

Ou plus simple : conditionner avec un ternary (pas de placeholder) :
```tsx
<div className={`mt-6 grid grid-cols-1 gap-6 ${isPediatrie ? 'lg:grid-cols-2' : ''}`}>
  <QueuePreview />
  {isPediatrie && <VaccinationAlerts />}
</div>
```

### 8. Vérification des autres composants dashboard

**`VaccinationAlerts.tsx`** : s'il est rendu conditionnellement (étape 7), pas besoin de modifier ce composant lui-même.

**Vérifier que la page d'activité n'a pas de code pédiatrie-spécifique** : non, elle compte juste des consultations et patients.

**Vérifier que la page file d'attente n'a pas de code pédiatrie-spécifique** : non.

### 9. Seed — Mettre à jour Dr. Guinane

**Fichier** : `apps/cms/src/seed.ts`

Ligne 68, ajouter `specialty: 'pediatrie'` dans `settings` :

```ts
settings: {
  defaultLocale: "fr",
  activeTier: "dossier",
  specialty: "pediatrie",  // ← ajouter
},
```

### 10. Frontend — Vérifier les types CMS générés

**Fichier** : `apps/cms/payload-types.ts`

Après migration, le type `Tenant['settings']` doit inclure `specialty`. Vérifier que le fichier est régénéré automatiquement par Payload ou le mettre à jour manuellement si nécessaire.

---

## Ce qui est hors scope (ne pas faire)

- **Nouveaux champs cliniques** (allergies, antécédents, traitements) — le backlog dit "à auditer avant d'ajouter". `medicalNotes` sur `Patients` et `examenClinique`/`diagnostic` sur `Consultations` couvrent le besoin générique actuel. Ce sera un chantier séparé.
- **Formulaire de consultation personnalisable** par spécialité — chantier #18, très différent.
- **Suppression des champs pédiatriques** de la collection `Consultations` (`poids`, `taille`, `perimetreCranien` restent en base — ils sont juste conditionnés à l'affichage).
- **Modules spécifiques pour gynécologie/dermatologie** — hors scope v1.

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Tenants.ts` | Ajouter `specialty` select dans `settings` |
| `apps/frontend/src/lib/payload.ts` | Ajouter `specialty: string` au type `Tenant.settings` |
| `apps/frontend/src/app/api/onboarding/route.ts` | Extraire `specialty` du body, le passer à `settings` |
| `apps/frontend/src/components/onboarding/OnboardingFlow.tsx` | Ajouter sélecteur spécialité + état + passage à SignupForm |
| `apps/frontend/src/components/onboarding/SignupForm.tsx` | Accepter prop `specialty`, l'envoyer à l'API |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | Conditionner GrowthChart + VaccinationRecord + fetches |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx` | Accepter prop `isPediatrie`, conditionner PC |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/page.tsx` | Conditionner VaccinationAlerts sur `isPediatrie` |
| `apps/cms/src/seed.ts` | Ajouter `specialty: 'pediatrie'` au tenant Dr. Guinane |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration `specialty` | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après modification de collection CMS. Jamais de `push: true`.
2. **Rétrocompatibilité** : le champ `specialty` a un `defaultValue: 'generaliste'` — les tenants existants sans la colonne auront `generaliste` après migration. Dr. Guinane est mis à jour à `pediatrie` via le seed (étape 9).
3. **Design system** : tokens sémantiques uniquement.
4. **Pas de `any`** sans justification.
5. **Pas de logique clinique automatique** (seuils, alertes) dans les nouveaux champs — même principe que la décision déjà actée d'écarter la validation de dose.
6. **Composants serveur par défaut** — `'use client'` uniquement là où c'est déjà le cas.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit && npx next build
```

Aucun commit si le build échoue.

---

## Ordre d'implémentation

1. `Tenants.ts` — ajout champ `specialty` + migration CMS
2. `payload.ts` — mise à jour type `Tenant`
3. `seed.ts` — ajout `specialty` à Dr. Guinane
4. `onboarding/route.ts` — accepter `specialty`
5. `OnboardingFlow.tsx` + `SignupForm.tsx` — UI sélecteur spécialité
6. `patients/[id]/page.tsx` — conditionner modules pédiatriques
7. `ConsultationForm.tsx` — conditionner PC
8. `dashboard/page.tsx` — conditionner VaccinationAlerts
9. Vérifier `payload-types.ts` régénéré
10. Build gate
