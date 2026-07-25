# Issue : Champs cliniques enrichis (antécédents, allergies, traitements)

## Contexte

- Le dossier patient a déjà `medicalNotes` (textarea libre). Mais pour un usage clinique structuré, trois champs manquent : **antécédents médicaux**, **allergies**, **traitements en cours**.
- Ces champs font partie du "socle commun" défini au chantier #1 : communs à toutes les spécialités, pas pédiatrie-only.
- Même contrôle d'accès que `medicalNotes` : doctor, tenant_admin, superadmin uniquement. La secrétaire ne les voit pas.
- L'UI existante de `PatientNotesForm` est le modèle à suivre (textarea + bouton enregistrer).

---

## Travail à faire

### 1. CMS — Ajouter 3 champs à `Patients`

**Fichier** : `apps/cms/src/collections/Patients.ts`

Ajouter après `medicalNotes` (ligne ~115, avant la fermeture de `fields`), en respectant le même pattern d'access control :

```typescript
{
  name: 'antecedents',
  type: 'textarea',
  label: 'Antécédents médicaux',
  access: {
    read: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
  },
},
{
  name: 'allergies',
  type: 'textarea',
  label: 'Allergies connues',
  access: {
    read: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
  },
},
{
  name: 'traitementsEnCours',
  type: 'textarea',
  label: 'Traitements en cours',
  access: {
    read: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
  },
},
```

**IMPORTANT** : migration Payload obligatoire :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 2. Refacto PatientNotesForm → PatientClinicalFields

**Fichier à renommer/modifier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PatientNotesForm.tsx`

Renommer le composant en `PatientClinicalFields` (fichier à renommer). Le composant gère maintenant 4 champs au lieu d'un seul.

#### 2a. Props

```tsx
type Props = {
  patientId: string
  initialData: {
    medicalNotes?: string
    antecedents?: string
    allergies?: string
    traitementsEnCours?: string
  } | null  // null = pas d'accès (secrétaire)
}
```

#### 2b. États

```tsx
const [medicalNotes, setMedicalNotes] = useState(initialData?.medicalNotes ?? '')
const [antecedents, setAntecedents] = useState(initialData?.antecedents ?? '')
const [allergies, setAllergies] = useState(initialData?.allergies ?? '')
const [traitementsEnCours, setTraitementsEnCours] = useState(initialData?.traitementsEnCours ?? '')
const [saving, setSaving] = useState(false)
const [saved, setSaved] = useState(false)
const [expandedSection, setExpandedSection] = useState<string | null>(null)
```

#### 2c. Gestion accès

```tsx
if (!initialData) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
      Dossier clinique — accès restreint aux médecins.
    </div>
  )
}
```

#### 2d. UI — 4 sections pliables

Utiliser un accordéon simple : chaque champ est une section cliquable qui s'ouvre/ferme. Par défaut, tout est fermé (aperçu des premières lignes). Au clic, la section s'ouvre avec le textarea.

```tsx
const fields = [
  { key: 'medicalNotes', label: 'Notes médicales', value: medicalNotes, setter: setMedicalNotes },
  { key: 'antecedents', label: 'Antécédents médicaux', value: antecedents, setter: setAntecedents },
  { key: 'allergies', label: 'Allergies connues', value: allergies, setter: setAllergies },
  { key: 'traitementsEnCours', label: 'Traitements en cours', value: traitementsEnCours, setter: setTraitementsEnCours },
]
```

Pour chaque champ :

```tsx
<div key={f.key} className="border-b border-stone-100 last:border-0">
  <button
    type="button"
    onClick={() => setExpandedSection(expandedSection === f.key ? null : f.key)}
    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-200 hover:bg-stone-50"
  >
    <div className="min-w-0 flex-1">
      <span className="text-sm font-medium text-stone-700">{f.label}</span>
      {expandedSection !== f.key && f.value && (
        <p className="mt-0.5 truncate text-xs text-stone-400">{f.value.slice(0, 80)}{f.value.length > 80 ? '...' : ''}</p>
      )}
      {expandedSection !== f.key && !f.value && (
        <p className="mt-0.5 text-xs italic text-stone-300">Aucune information</p>
      )}
    </div>
    <span className="ml-2 text-xs text-stone-400 shrink-0">
      {expandedSection === f.key ? 'Fermer ▲' : 'Modifier ▼'}
    </span>
  </button>
  {expandedSection === f.key && (
    <div className="px-4 pb-4">
      <textarea
        rows={4}
        value={f.value}
        onChange={(e) => f.setter(e.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        placeholder={`Saisir ${f.label.toLowerCase()}...`}
      />
    </div>
  )}
</div>
```

#### 2e. Bouton "Enregistrer tout"

Un seul bouton en bas de la carte qui PATCH tous les champs d'un coup :

```tsx
const handleSave = async () => {
  setSaving(true)
  setSaved(false)
  const res = await fetch(`/api/cms-proxy/patients/${patientId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medicalNotes, antecedents, allergies, traitementsEnCours }),
  })
  if (res.ok) {
    setSaved(true)
    router.refresh()
  }
  setSaving(false)
}
```

Afficher le bouton sous la liste des sections :

```tsx
<div className="flex items-center gap-3 px-4 py-3">
  <button onClick={handleSave} disabled={saving}
    className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
    {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
  </button>
  {saved && <span className="text-sm text-green-600">Enregistré ✓</span>}
</div>
```

### 3. Page patient — adapter l'appel au composant

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

#### 3a. Remplacer l'import

```tsx
// Avant :
import PatientNotesForm from './PatientNotesForm'
// Après :
import PatientClinicalFields from './PatientClinicalFields'
```

#### 3b. Adapter le type Patient

Ajouter les nouveaux champs au type `Patient` :

```tsx
type Patient = {
  // ...existing fields
  medicalNotes?: string
  antecedents?: string
  allergies?: string
  traitementsEnCours?: string
  // ...
}
```

#### 3c. Remplacer l'appel

```tsx
// Avant :
<PatientNotesForm patientId={patient.id} initialNotes={patient.medicalNotes || ''} />
// Après :
<PatientClinicalFields
  patientId={patient.id}
  initialData={canViewClinical ? {
    medicalNotes: patient.medicalNotes,
    antecedents: patient.antecedents,
    allergies: patient.allergies,
    traitementsEnCours: patient.traitementsEnCours,
  } : null}
/>
```

### 4. Renommer le fichier

```bash
mv apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PatientNotesForm.tsx \
   apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PatientClinicalFields.tsx
```

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Patients.ts` | Ajouter `antecedents`, `allergies`, `traitementsEnCours` |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PatientNotesForm.tsx` | Renommer en `PatientClinicalFields.tsx`, refacto 4 champs accordéon |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | Importer `PatientClinicalFields`, passer les nouveaux champs |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration patients | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après modification de collection CMS.
2. **Même access control que `medicalNotes`** : doctor/tenant_admin/superadmin uniquement.
3. **Design system** : tokens sémantiques.
4. **Pas de `any`**.
5. **Un seul PATCH** pour les 4 champs (pas 4 requêtes séparées — ce serait lent).

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `Patients.ts` — 3 champs + migration
2. `PatientClinicalFields.tsx` — renommer + refacto accordéon
3. `patients/[id]/page.tsx` — adapter l'appel
4. Build gate
