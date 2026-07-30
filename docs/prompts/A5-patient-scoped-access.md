# Feature A.5 — Accès patient scopé par médecin + partage entre confrères

## Contexte

- Aujourd'hui, le scope d'accès aux patients est `tenant` + `rôle`. Tous les docteurs d'un même cabinet voient tous les patients — pas de confidentialité inter-médecin.
- En tier `clinique` (cabinet de groupe), un médecin ne devrait voir par défaut que **ses propres patients**, pas ceux de ses associés.
- Un mécanisme de partage explicite permet de donner accès à un patient spécifique à un autre médecin du cabinet (remplacement, avis, suivi croisé).
- `QueueItems.doctor` (ajouté au chantier #3) résout l'affichage de la file d'attente, mais pas l'accès aux dossiers complets.
- Le lien `Doctors`↔`Users` (chantier #2) est déjà en place — on peut lister les confrères du même tenant.

---

## Architecture

```
Patients.followedBy (hasMany → users)
  → Médecin(s) responsable(s) du patient. Défaut : le créateur.

Patients.sharedWith (hasMany → users)
  → Médecins du cabinet ayant reçu un accès ponctuel.

Access control read/update/delete :
  superadmin / tenant_admin → tous les patients du tenant
  doctor → uniquement les patients où le médecin est dans followedBy OU sharedWith
  secretary / substitute → logique existante (tous les patients du tenant)
  Si followedBy est vide (anciens patients) → accès ouvert (fallback rétrocompatible)
```

---

## Travail à faire

### 1. CMS — Ajouter `followedBy` et `sharedWith` sur Patients

**Fichier** : `apps/cms/src/collections/Patients.ts`

Ajouter après `referringPractitioners` (ou à la fin des fields) :

```typescript
{
  name: 'followedBy',
  type: 'relationship',
  relationTo: 'users',
  hasMany: true,
  label: 'Suivi par',
  admin: { description: 'Médecins responsables du suivi de ce patient' },
  hooks: {
    beforeChange: [
      ({ data, req, operation }: any) => {
        // Auto-remplir avec le créateur si vide
        if (operation === 'create' && req.user && (!data?.followedBy || data.followedBy.length === 0)) {
          data.followedBy = [req.user.id]
        }
      },
    ],
  },
},
{
  name: 'sharedWith',
  type: 'relationship',
  relationTo: 'users',
  hasMany: true,
  label: 'Partagé avec',
  admin: { description: 'Médecins ayant reçu un accès ponctuel à ce dossier' },
},
```

### 2. CMS — Mettre à jour l'access control

**Fichier** : `apps/cms/src/collections/Patients.ts`

Remplacer les méthodes `read`, `update`, `delete` pour intégrer le scope docteur :

```typescript
access: {
  read: ({ req: { user } }: any) => {
    if (!user) return false
    const roles: string[] = user.roles ?? []
    if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
    const tid = tenantId(user)
    if (!tid) return false

    // Pour les docteurs, restreindre aux patients qu'ils suivent ou qui sont partagés
    if (roles.includes('doctor')) {
      return {
        and: [
          { tenant: { equals: tid } },
          {
            or: [
              // Cas 1 : le docteur est dans followedBy
              { followedBy: { in: [user.id] } },
              // Cas 2 : le docteur est dans sharedWith
              { sharedWith: { in: [user.id] } },
              // Cas 3 : ni l'un ni l'autre n'est renseigné (anciens patients, rétrocompatibilité)
              { and: [
                { followedBy: { exists: false } },
                { sharedWith: { exists: false } },
              ]},
            ],
          },
        ],
      }
    }

    // Secretary, substitute, etc. : accès tenant normal
    return { tenant: { equals: tid } }
  },

  create: ({ req: { user } }: any): boolean => {
    const roles: string[] = user?.roles ?? []
    if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
    if (roles.includes('doctor')) return !!tenantId(user)
    return false
  },

  update: ({ req: { user } }: any) => {
    const tid = tenantId(user)
    if (!tid) return false
    const roles: string[] = user?.roles ?? []
    if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
    // Docteur : peut modifier uniquement les patients qu'il suit ou qui sont partagés
    if (roles.includes('doctor')) {
      return {
        and: [
          { tenant: { equals: tid } },
          {
            or: [
              { followedBy: { in: [user.id] } },
              { sharedWith: { in: [user.id] } },
              { and: [
                { followedBy: { exists: false } },
                { sharedWith: { exists: false } },
              ]},
            ],
          },
        ],
      }
    }
    return false
  },

  delete: ({ req: { user } }: any) => {
    const tid = tenantId(user)
    if (!tid) return false
    const roles: string[] = user?.roles ?? []
    if (roles.includes('superadmin') || roles.includes('tenant_admin')) return true
    // Docteur : peut supprimer uniquement les patients qu'il suit ou qui sont partagés
    if (roles.includes('doctor')) {
      return {
        and: [
          { tenant: { equals: tid } },
          {
            or: [
              { followedBy: { in: [user.id] } },
              { and: [
                { followedBy: { exists: false } },
                { sharedWith: { exists: false } },
              ]},
            ],
          },
        ],
      }
    }
    return false
  },
},
```

> Note : `delete` ne vérifie pas `sharedWith` — un médecin ne peut pas supprimer un patient juste parce qu'il est partagé avec lui, seulement s'il est le médecin responsable (`followedBy`).

**IMPORTANT** : migration Payload obligatoire :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 3. Data migration — backfill `followedBy` pour les patients existants

Dans le fichier de migration SQL généré par Payload (ou via un script de migration), ajouter une étape de données. Option la plus simple : ajouter un script dans la migration qui met à jour les patients sans `followedBy`.

**Dans le fichier de migration généré**, après le `ALTER TABLE`, ajouter une étape `postMigrate` :

```typescript
// Dans le fichier de migration TypeScript :
export async function up({ payload }: any) {
  // ... SQL généré par Payload ...

  // Backfill : pour chaque patient sans followedBy, assigner le docteur du tenant
  const patients = await payload.find({
    collection: 'patients',
    where: { followedBy: { exists: false } },
    limit: 1000,
  })

  for (const patient of patients.docs) {
    const tenantId = typeof patient.tenant === 'object' ? patient.tenant.id : patient.tenant
    if (!tenantId) continue

    // Trouver un utilisateur docteur de ce tenant
    const doctors = await payload.find({
      collection: 'users',
      where: {
        tenant: { equals: tenantId },
        roles: { contains: 'doctor' },
      },
      limit: 1,
      depth: 0,
    })

    if (doctors.docs.length > 0) {
      await payload.update({
        collection: 'patients',
        id: patient.id,
        data: { followedBy: [doctors.docs[0].id] },
      })
    }
  }
}
```

### 4. UI — Widget de partage sur la fiche patient

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/SharePatientWidget.tsx`

Composant client visible uniquement pour les docteurs en tier `clinique` :

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, X } from 'lucide-react'

type Doctor = { id: string; name: string; email: string }

type Props = {
  patientId: string
  sharedWithIds: string[]
  followedByIds: string[]
  isClinique: boolean
  currentUserId: string
}

export default function SharePatientWidget({
  patientId, sharedWithIds, followedByIds, isClinique, currentUserId,
}: Props) {
  const router = useRouter()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [shared, setShared] = useState<string[]>(sharedWithIds)

  useEffect(() => {
    if (!isClinique) return
    fetch('/api/cms-proxy/users?where[roles][contains]=doctor&depth=0&limit=50')
      .then(r => r.json())
      .then(j => setDoctors(j.docs?.filter((d: Doctor) => d.id !== currentUserId) ?? []))
  }, [isClinique, currentUserId])

  const share = async (doctorId: string) => {
    const newIds = [...shared, doctorId]
    setShared(newIds)
    await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith: newIds }),
    })
    router.refresh()
  }

  const unshare = async (doctorId: string) => {
    const newIds = shared.filter(id => id !== doctorId)
    setShared(newIds)
    await fetch(`/api/cms-proxy/patients/${patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWith: newIds }),
    })
    router.refresh()
  }

  if (!isClinique) return null

  const sharedDoctors = doctors.filter(d => shared.includes(d.id))

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800 flex items-center gap-2">
          <Share2 className="size-4 text-stone-400" />
          Partage
        </h2>
      </div>
      <div className="px-4 py-3 space-y-2">
        {/* Docteurs avec qui le dossier est partagé */}
        {sharedDoctors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sharedDoctors.map(d => (
              <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                {d.name}
                <button onClick={() => unshare(d.id)} className="text-amber-400 hover:text-amber-600">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Sélecteur pour partager */}
        {doctors.filter(d => !shared.includes(d.id)).length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) share(e.target.value) }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          >
            <option value="">+ Partager avec un confrère</option>
            {doctors.filter(d => !shared.includes(d.id)).map(d => (
              <option key={d.id} value={d.id}>{d.name} — {d.email}</option>
            ))}
          </select>
        )}

        {sharedDoctors.length === 0 && doctors.length === 0 && (
          <p className="text-xs text-stone-400">Aucun confrère dans ce cabinet.</p>
        )}
      </div>
    </div>
  )
}
```

### 5. Intégrer sur la fiche patient

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

#### 5a. Récupérer les données

```tsx
const tenantId = typeof user.tenant === 'object' ? (user.tenant as any).id : user.tenant
const tenant = tenantId ? await getTenantById(tenantId) : null
const isClinique = tenant?.settings?.activeTier === 'clinique'
const isDoctor = user.roles?.includes('doctor')

const sharedWithIds: string[] = (patient as any).sharedWith
  ? Array.isArray((patient as any).sharedWith)
    ? (patient as any).sharedWith.map((s: any) => typeof s === 'object' ? s.id : s)
    : []
  : []

const followedByIds: string[] = (patient as any).followedBy
  ? Array.isArray((patient as any).followedBy)
    ? (patient as any).followedBy.map((f: any) => typeof f === 'object' ? f.id : f)
    : []
  : []
```

#### 5b. Ajouter l'import et le composant

```tsx
import SharePatientWidget from './SharePatientWidget'
```

Placer après `AddToQueueButton` :

```tsx
{isClinique && isDoctor && (
  <div className="mb-8">
    <SharePatientWidget
      patientId={patient.id}
      sharedWithIds={sharedWithIds}
      followedByIds={followedByIds}
      isClinique={isClinique}
      currentUserId={user.id}
    />
  </div>
)}
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/SharePatientWidget.tsx` | Widget partage |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Patients.ts` | Ajouter `followedBy` + `sharedWith` + mise à jour access control |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | Intégrer SharePatientWidget |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration Patients | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |
| Data migration `followedBy` | Dans le fichier de migration généré (étape 3) |

---

## Règles obligatoires

1. **Migration obligatoire** après modification de collection CMS.
2. **Rétrocompatibilité** : cas "ni followedBy ni sharedWith" → accès ouvert (anciens patients non migrés).
3. **Data migration** : backfill `followedBy` pour les patients existants.
4. **Design system** : tokens sémantiques.
5. **Pas de `any`** sans justification.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `Patients.ts` — champs + access control + migration CMS
2. Data migration — backfill followedBy
3. `SharePatientWidget.tsx` — composant
4. `patients/[id]/page.tsx` — intégration
5. Build gate
