# Issue : Modèles de consultation et d'ordonnance réutilisables

## Contexte

- Les consultations et ordonnances sont saisies intégralement à chaque fois. Un médecin qui répète les mêmes motifs/diagnostics/posologies perd du temps.
- Solution : templates enregistrables, chargeables en un clic dans le formulaire existant.
- Type de template : `consultation` (pré-remplit motif, examen clinique, diagnostic, code acte) ou `prescription` (pré-remplit medications[], notes).
- Stockage : nouvelle collection Payload `templates`, filtrée par tenant.

---

## Travail à faire

### 1. Collection CMS `templates`

**Fichier à créer** : `apps/cms/src/collections/Templates.ts`

```typescript
import type { CollectionConfig } from 'payload'

function tenantId(user: any): string | undefined {
  if (!user?.tenant) return undefined
  return typeof user.tenant === 'object' ? user.tenant.id : user.tenant
}

export const Templates: CollectionConfig = {
  slug: 'templates',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'tenant'],
    group: 'Cabinet',
  },
  access: {
    read: ({ req: { user } }: any) => {
      if (user?.roles?.includes('superadmin')) return true
      const id = tenantId(user)
      if (!id) return false
      return { tenant: { equals: id } }
    },
    create: ({ req: { user } }: any): boolean => {
      const roles: string[] = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const id = tenantId(user)
      if (!id) return false
      return { tenant: { equals: id } }
    },
    delete: ({ req: { user } }: any) => {
      const id = tenantId(user)
      if (!id) return false
      return { tenant: { equals: id } }
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
    { name: 'name', type: 'text', required: true, label: 'Nom du modèle' },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Consultation', value: 'consultation' },
        { label: 'Ordonnance', value: 'prescription' },
      ],
      label: 'Type',
    },
    // Champs consultation
    { name: 'motif', type: 'text', label: 'Motif (consultation)' },
    { name: 'examenClinique', type: 'textarea', label: 'Examen clinique (consultation)' },
    { name: 'diagnostic', type: 'textarea', label: 'Diagnostic (consultation)' },
    { name: 'codeActe', type: 'text', label: 'Code acte (consultation)' },
    // Champs ordonnance
    { name: 'medications', type: 'json', label: 'Médicaments (ordonnance)', admin: { description: 'Array de { nom, dci, posologie, duree }' } },
    { name: 'notes', type: 'textarea', label: 'Notes (ordonnance)' },
  ],
}
```

**Enregistrer dans** `apps/cms/src/payload.config.ts` (suivre le pattern existant).

**IMPORTANT** : migration :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 2. ConsultationForm — bouton "Charger un modèle" + "Sauvegarder comme modèle"

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx`

#### 2a. Charger un modèle

Ajouter un `useEffect` qui fetch les templates de type `consultation` au montage :

```tsx
const [templates, setTemplates] = useState<{ id: string; name: string; motif?: string; examenClinique?: string; diagnostic?: string; codeActe?: string }[]>([])

useEffect(() => {
  fetch('/api/cms-proxy/templates?where[type][equals]=consultation&depth=0&limit=50')
    .then(r => r.json())
    .then(j => setTemplates(j.docs ?? []))
    .catch(() => {})
}, [])
```

Ajouter un sélecteur en haut du formulaire (juste après `{showForm &&`) :

```tsx
{templates.length > 0 && (
  <div className="flex items-center gap-2">
    <select
      defaultValue=""
      onChange={(e) => {
        const t = templates.find(tmpl => tmpl.id === e.target.value)
        if (t) {
          setMotif(t.motif || '')
          setExamenClinique(t.examenClinique || '')
          setDiagnostic(t.diagnostic || '')
          setCodeActe(t.codeActe || '')
        }
      }}
      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
    >
      <option value="">Charger un modèle...</option>
      {templates.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  </div>
)}
```

Placer ce sélecteur après le `<form>` opening tag, avant le champ "Motif".

#### 2b. Sauvegarder comme modèle

Ajouter un bouton "Sauvegarder comme modèle" à côté de "Enregistrer" et "Annuler" en bas du formulaire. Au clic, ouvrir une mini modale (ou un prompt) pour saisir le nom du modèle, puis POST vers `/api/cms-proxy/templates` :

```tsx
const [savingTemplate, setSavingTemplate] = useState(false)

const saveAsTemplate = async () => {
  const name = prompt('Nom du modèle :')
  if (!name?.trim()) return
  setSavingTemplate(true)
  const res = await fetch('/api/cms-proxy/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      type: 'consultation',
      motif: motif || undefined,
      examenClinique: examenClinique || undefined,
      diagnostic: diagnostic || undefined,
      codeActe: codeActe || undefined,
    }),
  })
  if (res.ok) {
    // Re-fetch les templates pour mettre à jour le sélecteur
    const t = await fetch('/api/cms-proxy/templates?where[type][equals]=consultation&depth=0&limit=50')
    const j = await t.json()
    setTemplates(j.docs ?? [])
  }
  setSavingTemplate(false)
}
```

Ajouter le bouton dans le footer du formulaire :

```tsx
<button type="button" onClick={saveAsTemplate} disabled={savingTemplate}
  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
  {savingTemplate ? 'Enregistrement…' : 'Sauvegarder comme modèle'}
</button>
```

### 3. PrescriptionForm — bouton "Charger un modèle" + "Sauvegarder comme modèle"

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx`

Même pattern que pour ConsultationForm, adapté aux champs prescription.

#### 3a. Type et fetch

```tsx
type TemplateDoc = {
  id: string
  name: string
  medications?: { nom: string; dci: string; posologie: string; duree: string }[]
  notes?: string | null
}

const [templates, setTemplates] = useState<TemplateDoc[]>([])

useEffect(() => {
  fetch('/api/cms-proxy/templates?where[type][equals]=prescription&depth=0&limit=50')
    .then(r => r.json())
    .then(j => setTemplates(j.docs ?? []))
    .catch(() => {})
}, [])
```

#### 3b. Sélecteur de modèle

Ajouter dans le formulaire (après `{showForm &&`), avant la liste des médicaments :

```tsx
{templates.length > 0 && (
  <div className="flex items-center gap-2">
    <select
      defaultValue=""
      onChange={(e) => {
        const t = templates.find(tmpl => tmpl.id === e.target.value)
        if (t) {
          if (t.medications?.length) setMedications(t.medications)
          if (t.notes) setNotes(t.notes)
        }
      }}
      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
    >
      <option value="">Charger un modèle...</option>
      {templates.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  </div>
)}
```

#### 3c. Sauvegarder comme modèle

```tsx
const [savingTemplate, setSavingTemplate] = useState(false)

const saveAsTemplate = async () => {
  const name = prompt('Nom du modèle :')
  if (!name?.trim()) return
  setSavingTemplate(true)
  const res = await fetch('/api/cms-proxy/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      type: 'prescription',
      medications: medications.filter(m => m.nom.trim()),
      notes: notes || undefined,
    }),
  })
  if (res.ok) {
    const t = await fetch('/api/cms-proxy/templates?where[type][equals]=prescription&depth=0&limit=50')
    const j = await t.json()
    setTemplates(j.docs ?? [])
  }
  setSavingTemplate(false)
}
```

Ajouter le bouton à côté de "Enregistrer" / "Annuler" :

```tsx
<button type="button" onClick={saveAsTemplate} disabled={savingTemplate}
  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
  {savingTemplate ? 'Enregistrement…' : 'Sauvegarder comme modèle'}
</button>
```

### 4. Enregistrer la collection dans payload.config

**Fichier** : `apps/cms/src/payload.config.ts`

Ajouter l'import et l'enregistrement de `Templates` dans l'array `collections`.

---

## Ce qui est hors scope

- **Gestion avancée des templates** (édition, suppression, favoris, catégories) — le CMS Payload admin permet déjà de les gérer. Le formulaire frontend offre juste charger/sauvegarder.
- **Templates partagés entre tenants** — chaque template est scopé au tenant.
- **Auto-complétion des médicaments** — chantier #7 séparé.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/cms/src/collections/Templates.ts` | Collection Payload pour les modèles |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/payload.config.ts` | Enregistrer `Templates` dans `collections` |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx` | Sélecteur de modèle + bouton sauvegarder |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx` | Sélecteur de modèle + bouton sauvegarder |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration `templates` | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après création de collection CMS.
2. **Design system** : tokens sémantiques sur les nouveaux éléments UI.
3. **Pas de `any`** sans justification.
4. **Composants serveur par défaut** — les modifications restent dans des composants `'use client'` existants.
5. **Validation** : `medications.filter(m => m.nom.trim())` avant sauvegarde (ne pas enregistrer des lignes vides).

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `Templates.ts` — collection + migration
2. `payload.config.ts` — enregistrer la collection
3. `ConsultationForm.tsx` — charger + sauvegarder templates
4. `PrescriptionForm.tsx` — charger + sauvegarder templates
5. Build gate
