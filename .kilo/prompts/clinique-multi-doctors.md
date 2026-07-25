# Issue : Tier `clinique` — files d'attente par médecin

## Contexte

- Aujourd'hui, la file d'attente est une ressource **unique par tenant**. Tous les médecins d'un même tenant partagent la même file.
- Pour le tier `clinique` (cabinet de groupe), chaque médecin doit avoir sa propre file d'attente.
- Le lien `Users.doctorProfile` (#2) est déjà en place — on peut maintenant rattacher un item de file à un médecin spécifique.
- `QueueItems` n'a aujourd'hui **aucun champ `doctor`**.
- Rétrocompatibilité obligatoire : le tier `dossier` (médecin solo) ne doit pas changer de comportement.
- Cal.com multi-doctor** — hors scope code (config Cal.com côté infra).

---

## Travail à faire

### 1. CMS — Ajouter `QueueItems.doctor`

**Fichier** : `apps/cms/src/collections/QueueItems.ts`

Ajouter après le champ `patient` :

```typescript
{
  name: 'doctor',
  type: 'relationship',
  relationTo: 'doctors',
  label: 'Médecin',
  admin: { description: 'Médecin responsable de ce patient dans la file' },
},
```

Options clés :
- **Pas `required: true`** — rétrocompatibilité avec les tenants `dossier` existants et les items créés avant cette migration
- **Pas de `defaultValue`** — le hook `beforeChange` le remplit automatiquement

**Hook `beforeChange`** — modifier le hook existant pour auto-remplir `doctor` :

```typescript
hooks: {
  beforeChange: [
    ({ req, data, operation }: any) => {
      if (operation === 'create' && req.user?.tenant) {
        data.tenant = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
      }
      // Auto-remplir doctor depuis le doctorProfile de l'utilisateur
      if ((operation === 'create') && req.user?.doctorProfile && !data?.doctor) {
        data.doctor = typeof req.user.doctorProfile === 'object'
          ? req.user.doctorProfile.id
          : req.user.doctorProfile
      }
      return data
    },
  ],
},
```

La condition `!data?.doctor` permet au superadmin de forcer un doctor manuellement, mais par défaut il vient du user connecté.

**IMPORTANT** : migration Payload obligatoire :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 2. Queue page — sélecteur de médecin (tier `clinique`)

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/queue/page.tsx`

Actuellement : simple page serveur avec `LiveStatsWidget` + `WaitingRoomList`.

Modifier pour passer les infos de tier et de doctor au `WaitingRoomList` :

```tsx
import { requireAuth } from '@/lib/auth'
import { getTenantById } from '@/lib/payload'
import LiveStatsWidget from '@/components/dashboard/LiveStatsWidget'
import WaitingRoomList from '@/components/dashboard/WaitingRoomList'

export default async function QueuePage() {
  const user = await requireAuth()
  const tenantId = typeof user.tenant === 'object' ? (user.tenant as any).id : user.tenant
  const tenant = tenantId ? await getTenantById(tenantId) : null
  const isClinique = tenant?.settings?.activeTier === 'clinique'
  const currentDoctorId = typeof user.doctorProfile === 'object'
    ? (user.doctorProfile as any).id
    : user.doctorProfile

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-stone-800">File d'attente</h1>
      <div className="mt-6">
        <LiveStatsWidget />
      </div>
      <div className="mt-6">
        <WaitingRoomList
          tenantId={tenantId}
          isClinique={isClinique}
          currentDoctorId={currentDoctorId ? String(currentDoctorId) : undefined}
        />
      </div>
    </div>
  )
}
```

### 3. WaitingRoomList — filtre par docteur

**Fichier** : `apps/frontend/src/components/dashboard/WaitingRoomList.tsx`

Modifications :

#### 3a. Props

Ajouter les nouvelles props :

```tsx
type Props = {
  tenantId: string
  isClinique?: boolean
  currentDoctorId?: string
}
```

#### 3b. État sélecteur de docteur

Ajouter un state pour le doctor sélectionné + useState pour la liste des doctors :

```tsx
const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(currentDoctorId)
const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])
```

#### 3c. Fetch des doctors du tenant (clinique uniquement)

```tsx
useEffect(() => {
  if (!isClinique) return
  fetch(`/api/cms-proxy/doctors?where[tenant][equals]=${tenantId}&depth=0&limit=50`)
    .then(r => r.json())
    .then(j => setDoctors(j.docs ?? []))
    .catch(() => {})
}, [tenantId, isClinique])
```

#### 3d. Fetch queue filtré par doctor

Modifier `fetchQueue` pour ajouter le filtre `where[doctor][equals]` quand `selectedDoctorId` est défini :

```tsx
const fetchQueue = async () => {
  setLoading(true)
  let url = `/api/cms-proxy/queue-items?depth=1&sort=arrivalTime&where[status][in]=waiting&where[status][in]=in_consultation&limit=50`
  if (selectedDoctorId) {
    url += `&where[doctor][equals]=${selectedDoctorId}`
  }
  const res = await fetch(url)
  if (res.ok) {
    const json = await res.json()
    setItems(json.docs ?? [])
  }
  setLoading(false)
}
```

Et ajouter `fetchQueue` comme dépendance au changement de `selectedDoctorId` :

```tsx
useEffect(() => {
  fetchQueue()
  const interval = setInterval(fetchQueue, 15000)
  return () => clearInterval(interval)
}, [selectedDoctorId])
```

#### 3e. UI — sélecteur de docteur

Ajouter un dropdown dans l'en-tête du composant, visible uniquement si `isClinique` :

```tsx
{isClinique && doctors.length > 0 && (
  <select
    value={selectedDoctorId || ''}
    onChange={(e) => setSelectedDoctorId(e.target.value || undefined)}
    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
  >
    <option value="">Tous les médecins</option>
    {doctors.map((d) => (
      <option key={d.id} value={d.id}>{d.name}</option>
    ))}
  </select>
)}
```

Placer ce sélecteur à côté du titre "File d'attente en direct" et du bouton "Rafraîchir", dans le même conteneur flex.

#### 3f. Affichage du docteur sur chaque item

Si `isClinique` et qu'un item a un doctor, afficher le nom du docteur en petit sous le patient. Nécessite `depth=2` sur le fetch (pour résoudre `doctor.name`) ou une seconde requête. **Option pragmatique** : récupérer `doctor` en `depth=1` et afficher ce qui est résolu.

Modifier le type `QueueItem` :

```tsx
type QueueItem = {
  id: string
  status: string
  visitReason: string
  arrivalTime: string | null
  patient: Patient
  doctor?: { id: string; name: string } | null  // ← ajouter
}
```

Dans l'affichage, sous le nom du patient (ligne ~152), ajouter si `isClinique` :

```tsx
{item.doctor?.name && (
  <span className="text-xs text-stone-400">Dr. {item.doctor.name}</span>
)}
```

#### 3g. Mise à jour du status — pas de changement

Le `updateStatus` PATCH continue de marcher tel quel — le doctor ne change pas quand on passe `waiting → in_consultation → completed`.

### 4. AddToQueueButton — auto-assigner le docteur

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/AddToQueueButton.tsx`

Le corps de la requête POST (ligne 36-41) envoie déjà `patient`, `status`, `visitReason`, `arrivalTime`. Le hook CMS auto-assigne `doctor` depuis `req.user.doctorProfile`. **Aucune modification nécessaire** côté frontend — le hook CMS gère l'assignation automatiquement.

Vérifier quand même que le CMS proxy route transmet bien le token utilisateur (ce qui permet au hook de lire `req.user`). Le proxy `cms-proxy/[...path]` le fait déjà : il lit le cookie `payload-token` et l'envoie comme `Authorization: Bearer <token>`.

### 5. Stats — pas de changement immédiat

`LiveStatsWidget` et `QueuePreview` continuent de compter tous les items du tenant (comportement du tier `dossier` et par défaut `clinique`). Le filtrage par docteur pourra être ajouté dans un lot ultérieur si nécessaire — le backlog dit "Adapter les stats de la page Activité pour permettre un filtre par médecin", mais la page Activité compte les consultations (pas les files d'attente), et les consultations ont déjà un champ `practitioner`.

**Pas de modification sur LiveStatsWidget, QueuePreview, ni Activity dans ce chantier.**

---

## Ce qui est hors scope

- **Stats par médecin** (LiveStatsWidget, Activity) — viendra avec le besoin réel
- **Cal.com multi-doctor** — config infra, pas du code
- **Page Activité filtre par médecin** — les consultations ont déjà `practitioner`, le filtrage viendra plus tard
- **Sélecteur de docteur global dans la sidebar** — la sidebar n'a pas de notion de "médecin actif" pour l'instant

---

## Fichiers à créer

Aucun.

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/QueueItems.ts` | Ajouter champ `doctor` + hook auto-fill |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/queue/page.tsx` | Passer `isClinique`, `currentDoctorId` au WaitingRoomList |
| `apps/frontend/src/components/dashboard/WaitingRoomList.tsx` | Props étendues, sélecteur docteur, filtre fetch, affichage doctor |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration `QueueItems.doctor` | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après modification de collection CMS.
2. **Rétrocompatibilité** : `doctor` est optionnel. Les tenants `dossier` existants continuent de fonctionner sans changement visible. Le hook auto-remplit `doctor` depuis `req.user.doctorProfile` — si l'utilisateur n'a pas de doctorProfile, le champ reste vide (comportement actuel implicite).
3. **Design system** : tokens sémantiques sur les nouveaux éléments UI.
4. **Pas de `any`** sans justification.
5. **Composants serveur par défaut** — `WaitingRoomList` est déjà `'use client'`, pas de changement.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `QueueItems.ts` — champ `doctor` + hook auto-fill + migration
2. `WaitingRoomList.tsx` — props, sélecteur, filtre fetch
3. `queue/page.tsx` — passer les props
4. Build gate
