# Feature A.4 — Module Correspondants (médecins référents)

## Contexte

- Aucune notion de "médecin référent" n'existe dans le repo. Aucune collection équivalente.
- Le médecin traitant veut savoir quel confrère lui adresse le plus de patients (généraliste, gynéco, urgences...).
- Schéma simple : une collection `ReferringPractitioners` (nom, spécialité, téléphone, ville) + relation `hasMany` sur `Patients`.
- Faible risque, forte valeur, aucun conflit avec l'existant.

---

## Travail à faire

### 1. Collection CMS `ReferringPractitioners`

**Fichier à créer** : `apps/cms/src/collections/ReferringPractitioners.ts`

```typescript
import type { CollectionConfig } from 'payload'

export const ReferringPractitioners: CollectionConfig = {
  slug: 'referring-practitioners',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'specialty', 'city', 'tenant'],
    group: 'Cabinet',
  },
  access: {
    read: ({ req: { user } }: any) => {
      if (user?.roles?.includes('superadmin')) return true
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    create: ({ req: { user } }: any): boolean => {
      const roles = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    delete: ({ req: { user } }: any) => {
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }: any) => {
        if (operation === 'create' && req.user?.tenant) {
          data.tenant = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, admin: { readOnly: true } },
    { name: 'name', type: 'text', required: true, label: 'Nom du praticien' },
    { name: 'specialty', type: 'text', label: 'Spécialité' },
    { name: 'phone', type: 'text', label: 'Téléphone' },
    { name: 'city', type: 'text', label: 'Ville' },
    { name: 'notes', type: 'textarea', label: 'Notes' },
  ],
}
```

### 2. Patients — ajouter relation `referringPractitioners`

**Fichier** : `apps/cms/src/collections/Patients.ts`

Ajouter après le champ `medicalNotes` (ou `traitementsEnCours`, selon l'ordre existant) :

```typescript
{
  name: 'referringPractitioners',
  type: 'relationship',
  relationTo: 'referring-practitioners',
  hasMany: true,
  label: 'Médecins référents',
  admin: { description: 'Praticiens ayant adressé ce patient' },
},
```

**IMPORTANT** : migration Payload obligatoire pour les deux collections :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 3. Enregistrer la collection

**Fichier** : `apps/cms/src/payload.config.ts`

Ajouter l'import et l'enregistrement de `ReferringPractitioners`.

### 4. UI — sélecteur de médecins référents sur la fiche patient

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ReferringPractitionersWidget.tsx`

Composant client qui permet d'ajouter/retirer des médecins référents au patient :

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

type Practitioner = {
  id: string
  name: string
  specialty?: string
  city?: string
}

type Props = {
  patientId: string
  initialIds: string[]
}

export default function ReferringPractitionersWidget({ patientId, initialIds }: Props) {
  const router = useRouter()
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)
  const [loading, setLoading] = useState(true)

  // Fetch tous les praticiens du tenant
  useEffect(() => {
    fetch('/api/cms-proxy/referring-practitioners?depth=0&limit=200')
      .then(r => r.json())
      .then(j => setPractitioners(j.docs ?? []))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (practId: string) => {
    const newIds = selectedIds.includes(practId)
      ? selectedIds.filter(id => id !== practId)
      : [...selectedIds, practId]

    setSelectedIds(newIds)

    await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referringPractitioners: newIds }),
    })
    router.refresh()
  }

  if (loading) return <p className="text-xs text-stone-400">Chargement…</p>

  const selected = practitioners.filter(p => selectedIds.includes(p.id))
  const available = practitioners.filter(p => !selectedIds.includes(p.id))

  return (
    <div className="space-y-2">
      {/* Liste des référents déjà associés */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(p => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
              {p.name}
              <button onClick={() => toggle(p.id)} className="ml-0.5 text-primary-400 hover:text-primary-600">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Sélecteur pour ajouter */}
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => { if (e.target.value) toggle(e.target.value) }}
          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        >
          <option value="">+ Ajouter un médecin référent</option>
          {available.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.specialty ? ` — ${p.specialty}` : ''}{p.city ? ` (${p.city})` : ''}
            </option>
          ))}
        </select>
      )}

      {practitioners.length === 0 && (
        <p className="text-xs text-stone-400">Aucun médecin référent enregistré.</p>
      )}
    </div>
  )
}
```

### 5. Intégrer sur la fiche patient

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

#### 5a. Importer le widget

```tsx
import ReferringPractitionersWidget from './ReferringPractitionersWidget'
```

#### 5b. Extraire les IDs des praticiens du patient

```tsx
const referringIds: string[] = (patient as any).referringPractitioners
  ? Array.isArray((patient as any).referringPractitioners)
    ? (patient as any).referringPractitioners.map((r: any) => typeof r === 'object' ? r.id : r)
    : []
  : []
```

#### 5c. Ajouter la section

Après `AddToQueueButton` (ou après `PatientClinicalFields`), ajouter :

```tsx
<div className="mb-8 rounded-xl border border-stone-200 bg-white shadow-sm">
  <div className="border-b border-stone-100 px-4 py-3">
    <h2 className="font-heading text-lg font-semibold text-stone-800">Médecins référents</h2>
  </div>
  <div className="px-4 py-3">
    <ReferringPractitionersWidget patientId={patient.id} initialIds={referringIds} />
  </div>
</div>
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/cms/src/collections/ReferringPractitioners.ts` | Collection CMS |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ReferringPractitionersWidget.tsx` | Widget sélecteur |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Patients.ts` | Ajouter `referringPractitioners` relationship |
| `apps/cms/src/payload.config.ts` | Enregistrer `ReferringPractitioners` |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | Intégrer le widget |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migrations (2 collections) | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après ajout de champ et création de collection.
2. **Design system** : tokens sémantiques.
3. **Pas de `any`** — sauf pour `(patient as any).referringPractitioners` (Payload ne type pas les relations hasMany automatiquement).
4. **Widget client** : `'use client'` car il gère l'état et les appels API.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `ReferringPractitioners.ts` — collection CMS
2. `Patients.ts` — ajout relation
3. `payload.config.ts` — enregistrer
4. Migration CMS
5. `ReferringPractitionersWidget.tsx` — widget
6. `patients/[id]/page.tsx` — intégration
7. Build gate
