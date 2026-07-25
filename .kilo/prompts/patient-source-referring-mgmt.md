# Feature — Provenance patient + gestion des référents + stats

## Contexte

- Le module `ReferringPractitioners` (A.4) est livré : collection CMS + widget sur fiche patient. ✅
- Extension demandée :
  1. **Provenance patient** : suivre l'origine de chaque patient (Google, Facebook, médecin référent, bouche-à-oreille...), pas seulement les médecins référents.
  2. **Page de gestion** des médecins référents dans `/dashboard/settings` (ajout, édition, suppression).
  3. **Champ provenance** dans le formulaire de création/édition de patient.
  4. **Stats** de provenance sur la page Activité.

---

## Architecture

```
Patients.patientSource (select) :
  referring_practitioner | google | facebook | instagram | 
  autre_patient | connaissance | professionnel_sante | autre

Patients.patientSourceDetail (text, optionnel) :
  Détail libre (ex: "Dr. Martin", "Groupe Facebook mamans Agadir")

Patients.referringPractitioners (existant) :
  Utilisé uniquement si patientSource === 'referring_practitioner'

Activity page :
  Nouveau widget : répartition des sources (pie chart) +
  top médecins référents (liste)
```

---

## Travail à faire

### 1. CMS — Ajouter `patientSource` et `patientSourceDetail` sur Patients

**Fichier** : `apps/cms/src/collections/Patients.ts`

Ajouter après `nationalId` (ou avant `medicalNotes`) :

```typescript
{
  name: 'patientSource',
  type: 'select',
  options: [
    { label: 'Médecin référent', value: 'referring_practitioner' },
    { label: 'Google', value: 'google' },
    { label: 'Facebook', value: 'facebook' },
    { label: 'Instagram', value: 'instagram' },
    { label: 'Recommandé par un autre patient', value: 'autre_patient' },
    { label: 'Connaissance / Bouche-à-oreille', value: 'connaissance' },
    { label: 'Professionnel de santé', value: 'professionnel_sante' },
    { label: 'Autre', value: 'autre' },
  ],
  label: 'Provenance du patient',
  admin: { description: 'Comment le patient a-t-il connu le cabinet ?' },
},
{
  name: 'patientSourceDetail',
  type: 'text',
  label: 'Détail de la provenance',
  admin: { description: 'Nom du médecin, nom du patient référent, groupe Facebook, etc.' },
},
```

**IMPORTANT** : migration Payload obligatoire.

### 2. Formulaire nouveau patient — ajouter provenance

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/new/page.tsx`

#### 2a. États

```typescript
const [patientSource, setPatientSource] = useState('')
const [patientSourceDetail, setPatientSourceDetail] = useState('')
const [referringIds, setReferringIds] = useState<string[]>([])
```

#### 2b. Fetch des référents (pour le sélecteur conditionnel)

```typescript
const [referringOptions, setReferringOptions] = useState<{ id: string; name: string }[]>([])
useEffect(() => {
  fetch('/api/cms-proxy/referring-practitioners?depth=0&limit=200')
    .then(r => r.json()).then(j => setReferringOptions(j.docs ?? []))
}, [])
```

#### 2c. Rendu — après le champ CIN, avant la checkbox "Ajouter à la file"

```tsx
<div>
  <label className="mb-1 block text-sm font-medium text-stone-700">Provenance</label>
  <select value={patientSource} onChange={e => setPatientSource(e.target.value)}
    className={inputClass}>
    <option value="">Non renseigné</option>
    <option value="referring_practitioner">Médecin référent</option>
    <option value="google">Google</option>
    <option value="facebook">Facebook</option>
    <option value="instagram">Instagram</option>
    <option value="autre_patient">Recommandé par un autre patient</option>
    <option value="connaissance">Connaissance / Bouche-à-oreille</option>
    <option value="professionnel_sante">Professionnel de santé</option>
    <option value="autre">Autre</option>
  </select>
</div>

{/* Sélecteur de médecin référent (si source = referring_practitioner) */}
{patientSource === 'referring_practitioner' && (
  <div>
    <label className="mb-1 block text-sm font-medium text-stone-700">Médecin référent</label>
    <select
      value={referringIds[0] || ''}
      onChange={e => setReferringIds(e.target.value ? [e.target.value] : [])}
      className={inputClass}>
      <option value="">Sélectionner…</option>
      {referringOptions.map(r => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  </div>
)}

{/* Détail libre (toujours visible, optionnel) */}
<div>
  <label className="mb-1 block text-sm font-medium text-stone-700">
    Détail <span className="text-stone-400 font-normal">(optionnel)</span>
  </label>
  <input value={patientSourceDetail} onChange={e => setPatientSourceDetail(e.target.value)}
    type="text" placeholder="Ex: Groupe Facebook mamans Agadir, Dr. Martin..."
    className={inputClass} />
</div>
```

#### 2d. Envoyer dans le POST (ligne ~37 du fichier original)

Ajouter au body :

```typescript
patientSource: patientSource || undefined,
patientSourceDetail: patientSourceDetail || undefined,
referringPractitioners: referringIds.length > 0 ? referringIds : undefined,
```

### 3. Formulaire édition patient — même chose

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/edit/EditPatientForm.tsx`

Mêmes modifications que le formulaire de création, avec pré-remplissage depuis les données existantes du patient.

Ajouter aux props :

```typescript
type Props = {
  patient: { ...; patientSource?: string; patientSourceDetail?: string; referringPractitioners?: (string | { id: string })[] }
}
```

Initialiser les états :

```typescript
const [patientSource, setPatientSource] = useState(patient.patientSource || '')
const [patientSourceDetail, setPatientSourceDetail] = useState(patient.patientSourceDetail || '')
const [referringIds, setReferringIds] = useState<string[]>(
  patient.referringPractitioners
    ? Array.isArray(patient.referringPractitioners)
      ? (patient.referringPractitioners as any[]).map((r: any) => typeof r === 'object' ? r.id : r)
      : []
    : []
)
```

Même UI, même body PATCH.

### 4. Page Settings — gestion des médecins référents

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ReferringPractitionersManager.tsx`

Composant client avec CRUD simple :

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

type Practitioner = { id: string; name: string; specialty?: string; phone?: string; city?: string; notes?: string }

export default function ReferringPractitionersManager() {
  const router = useRouter()
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Practitioner | null>(null)
  const [showNew, setShowNew] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = () => {
    fetch('/api/cms-proxy/referring-practitioners?depth=0&limit=200')
      .then(r => r.json()).then(j => setPractitioners(j.docs ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { fetchAll() }, [])

  const resetForm = () => { setName(''); setSpecialty(''); setPhone(''); setCity(''); setNotes(''); setError('') }
  const openNew = () => { resetForm(); setEditing(null); setShowNew(true) }
  const openEdit = (p: Practitioner) => { setName(p.name); setSpecialty(p.specialty || ''); setPhone(p.phone || ''); setCity(p.city || ''); setNotes(p.notes || ''); setEditing(p); setShowNew(true) }
  const cancel = () => { setShowNew(false); setEditing(null); resetForm() }

  const handleSave = async () => {
    if (!name.trim()) { setError('Nom requis'); return }
    setSaving(true); setError('')
    const body = { name: name.trim(), specialty: specialty.trim() || undefined, phone: phone.trim() || undefined, city: city.trim() || undefined, notes: notes.trim() || undefined }
    const url = editing ? `/api/cms-proxy/referring-practitioners/${editing.id}` : '/api/cms-proxy/referring-practitioners'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { cancel(); fetchAll(); router.refresh() }
    else { setError('Erreur lors de l\'enregistrement') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce praticien ?')) return
    await fetch(`/api/cms-proxy/referring-practitioners/${id}`, { method: 'DELETE' })
    fetchAll(); router.refresh()
  }

  const inputClass = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

  if (loading) return <p className="text-sm text-stone-400">Chargement…</p>

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Médecins référents</h2>
        <button onClick={openNew} className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800">
          <Plus className="size-3.5 inline mr-1" />Ajouter
        </button>
      </div>

      {/* Formulaire nouveau/édition */}
      {showNew && (
        <div className="border-b border-stone-100 p-4 space-y-3 bg-stone-50">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom *" className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Spécialité" className={inputClass} />
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ville" className={inputClass} />
          </div>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" className={inputClass} />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className={inputClass} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {saving ? '…' : editing ? 'Modifier' : 'Ajouter'}
            </button>
            <button onClick={cancel} className="text-xs text-stone-500 hover:text-stone-700">Annuler</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {practitioners.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-400">Aucun médecin référent enregistré.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {practitioners.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">{p.name}</p>
                <p className="text-xs text-stone-500">
                  {[p.specialty, p.city, p.phone].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => openEdit(p)} className="rounded p-1 text-stone-400 hover:text-primary-600"><Pencil className="size-3.5" /></button>
                <button onClick={() => handleDelete(p.id)} className="rounded p-1 text-stone-400 hover:text-red-600"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 5. Intégrer dans Settings

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx`

Ajouter l'import et le composant après `ManageAccounts` :

```tsx
import ReferringPractitionersManager from './ReferringPractitionersManager'
```

Dans le JSX, après `ManageAccounts` :

```tsx
{isAdmin && <ReferringPractitionersManager />}
```

### 6. Stats de provenance sur Activité

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx`

Ajouter un fetch pour les patients avec leur source :

```typescript
const patientsWithSource = patientsData?.docs?.filter((p: any) => p.patientSource) ?? []

const sourceCounts: Record<string, number> = {}
for (const p of patientsWithSource) {
  const src = (p as any).patientSource
  sourceCounts[src] = (sourceCounts[src] || 0) + 1
}

const sourceLabels: Record<string, string> = {
  referring_practitioner: 'Médecin réf.',
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  autre_patient: 'Patient',
  connaissance: 'Bouche-à-oreille',
  professionnel_sante: 'Pro. santé',
  autre: 'Autre',
}

const sourceData = Object.entries(sourceCounts)
  .map(([key, count]) => ({ name: sourceLabels[key] || key, value: count }))
  .filter(d => d.value > 0)
```

Passer `sourceData` à `ActivityView`.

**Fichier** : `apps/frontend/src/components/dashboard/ActivityView.tsx`

Ajouter `sourceData` aux props et un pie chart "Provenance des patients" sous les graphiques existants :

```tsx
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'

type Props = {
  // ...existants
  sourceData?: { name: string; value: number }[]
}

const SOURCE_COLORS = ['#0F766E', '#D97706', '#2563EB', '#7C3AED', '#EC4899', '#F97316', '#84CC16', '#64748B']
```

Dans le JSX, ajouter sous le pie chart "Motifs de visite" :

```tsx
{sourceData && sourceData.length > 0 && (
  <div className="mb-6">
    <h3 className="mb-2 font-heading text-sm font-semibold text-stone-700">Provenance des patients</h3>
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
            label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
            {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
          </Pie>
          <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E7E5E4' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ReferringPractitionersManager.tsx` | CRUD référents |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Patients.ts` | Ajouter `patientSource` + `patientSourceDetail` |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/new/page.tsx` | Formulaire + provenance |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/edit/EditPatientForm.tsx` | Formulaire édition + provenance |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx` | Intégrer ReferringPractitionersManager |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx` | Fetch sourceCounts, passer sourceData |
| `apps/frontend/src/components/dashboard/ActivityView.tsx` | Pie chart provenance |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration Patients | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après ajout de champs Patients.
2. **Design system** : tokens sémantiques.
3. **Pas de `any`** sans justification.
4. **CRUD sécurisé** : les opérations passent par le proxy CMS avec le cookie `payload-token` → RBAC existant sur `ReferringPractitioners`.
5. **Stats** : les sources sans label sont filtrées (seuls les patients avec `patientSource` renseigné apparaissent).

## Build gate

```bash
cd apps/cms && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit && npx next build
```
