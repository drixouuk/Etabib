# Issue : Autocomplete médicaments depuis l'historique

## Contexte

- Le formulaire d'ordonnance a des champs `nom`, `dci`, `posologie`, `duree` à saisir manuellement. Le médecin répète souvent les mêmes médicaments.
- Objectif : autocomplete sur le champ "Nom" qui suggère les médicaments déjà prescrits par le tenant, et auto-remplit DCI/posologie/durée à la sélection.
- Source de données : **les prescriptions existantes du tenant** (pas de référentiel externe). Zéro dépendance, s'enrichit avec l'usage, pas de validation clinique nécessaire (c'est juste un assistant de saisie, pas une base pharmacologique).
- Les données sont privées au tenant : un généraliste ne voit que ses propres prescriptions, pas celles d'un autre cabinet.

---

## Architecture

```
PrescriptionForm (client)
  │
  │  tape "para" → debounce 300ms → fetch suggestions
  ▼
GET /api/medications/autocomplete?q=para
  │
  │  query CMS → prescriptions du tenant → extraire noms uniques
  ▼
Retourne [{ nom, dci, posologie, duree, count }]
  │
  │  affiche dropdown
  │  clic → setMedications[i] = { nom, dci, posologie, duree }
```

---

## Travail à faire

### 1. Endpoint autocomplete

**Fichier à créer** : `apps/frontend/src/app/api/medications/autocomplete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'

type PrescriptionDoc = {
  id: string
  medications: { nom: string; dci: string; posologie: string; duree: string }[]
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase()
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch prescriptions du tenant (access control Payload filtre automatiquement)
  const res = await fetch(`${CMS_URL}/api/prescriptions?depth=0&limit=500&sort=-date`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'CMS error' }, { status: 500 })
  }

  const data = await res.json()
  const prescriptions: PrescriptionDoc[] = data.docs ?? []

  // Extraire les médicaments uniques qui matchent la recherche
  const seen = new Map<string, { nom: string; dci: string; posologie: string; duree: string; count: number }>()

  for (const p of prescriptions) {
    for (const m of (p.medications ?? [])) {
      if (!m.nom?.trim()) continue
      const nomLower = m.nom.toLowerCase()
      if (!nomLower.includes(q)) continue

      const key = nomLower
      if (!seen.has(key)) {
        seen.set(key, { nom: m.nom.trim(), dci: m.dci?.trim() || '', posologie: m.posologie?.trim() || '', duree: m.duree?.trim() || '', count: 1 })
      } else {
        const entry = seen.get(key)!
        entry.count++
        // Garder les données les plus récentes (déjà les premières car trié par -date)
      }
    }
  }

  const suggestions = Array.from(seen.values())
    .sort((a, b) => b.count - a.count) // les plus utilisés en premier
    .slice(0, 8) // max 8 suggestions

  return NextResponse.json({ suggestions })
}
```

### 2. Modifier PrescriptionForm — autocomplete sur "Nom"

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx`

#### 2a. Props — ajouter `tenantId`

```tsx
type Props = {
  patientId: string
  prescriptions: Prescription[]
  consultations: ConsultationOption[]
  tenantId: string   // ← ajouter (pour l'appel API si besoin — le token suffit via cookie)
  doctorInfo?: DoctorInfo
  patientInfo?: PatientInfo
}
```

En réalité, `tenantId` n'est pas nécessaire côté client car l'endpoint autocomplete utilise le cookie `payload-token` et le CMS filtre par tenant automatiquement. Mais on le garde au cas où.

#### 2b. Type pour une suggestion

```tsx
type MedicationSuggestion = {
  nom: string
  dci: string
  posologie: string
  duree: string
  count: number
}
```

#### 2c. État pour l'autocomplete

Ajouter pour chaque médicament un état de suggestions et d'ouverture :

```tsx
const [suggestions, setSuggestions] = useState<Record<number, MedicationSuggestion[]>>({})
const [openDropdown, setOpenDropdown] = useState<number | null>(null)
const [loadingSuggestions, setLoadingSuggestions] = useState(false)
const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
```

Ajouter `useRef` à l'import de React.

#### 2d. Fonction de recherche

```tsx
const searchMedications = async (i: number, query: string) => {
  if (query.trim().length < 2) {
    setSuggestions(prev => ({ ...prev, [i]: [] }))
    setOpenDropdown(null)
    return
  }
  setLoadingSuggestions(true)
  const res = await fetch(`/api/medications/autocomplete?q=${encodeURIComponent(query.trim())}`)
  if (res.ok) {
    const data = await res.json()
    setSuggestions(prev => ({ ...prev, [i]: data.suggestions ?? [] }))
    if (data.suggestions?.length > 0) setOpenDropdown(i)
  }
  setLoadingSuggestions(false)
}
```

#### 2e. Modifier le champ "Nom" — ajouter onChange avec debounce

Remplacer l'input "Nom" simple par un input avec dropdown d'autocomplete. Utiliser un `useRef` pour le timer de debounce :

```tsx
const debounceRef = useRef<Record<number, NodeJS.Timeout>>({})
```

Modifier le champ "Nom" (ligne ~112-114 du fichier original) :

```tsx
<div className="relative">
  <label className="mb-0.5 block text-xs text-stone-600">Nom *</label>
  <input
    ref={(el) => { inputRefs.current[i] = el }}
    value={med.nom}
    onChange={e => {
      const val = e.target.value
      updateMed(i, 'nom', val)
      if (debounceRef.current[i]) clearTimeout(debounceRef.current[i])
      debounceRef.current[i] = setTimeout(() => searchMedications(i, val), 300)
    }}
    onFocus={() => {
      if (med.nom.trim().length >= 2) searchMedications(i, med.nom)
    }}
    onBlur={() => {
      // Délai pour permettre le clic sur la suggestion
      setTimeout(() => setOpenDropdown(curr => curr === i ? null : curr), 200)
    }}
    required
    className={inputClass}
    autoComplete="off"
  />
  
  {/* Dropdown suggestions */}
  {openDropdown === i && suggestions[i]?.length > 0 && (
    <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
      {suggestions[i].map((s, si) => (
        <button
          key={si}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault() // empêche le onBlur de fermer avant le clic
            updateMed(i, 'nom', s.nom)
            updateMed(i, 'dci', s.dci)
            updateMed(i, 'posologie', s.posologie)
            updateMed(i, 'duree', s.duree)
            setOpenDropdown(null)
          }}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-stone-700 transition-colors duration-200 hover:bg-primary-50"
        >
          <span className="font-medium">{s.nom}</span>
          <span className="text-xs text-stone-400">{s.count !== undefined && `×${s.count}`}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

### 3. Page patient — passer `tenantId`

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

Ajouter `tenantId` comme prop à PrescriptionForm :

```tsx
<PrescriptionForm
  patientId={patient.id}
  prescriptions={prescriptions}
  consultations={consultations}
  tenantId={tenantId}  // ← ajouter
  doctorInfo={doctorInfo}
  patientInfo={patientInfo}
/>
```

---

## Ce qui est hors scope

- **Base de médicaments externe** — pas de référentiel national ou ANSM. L'autocomplete est basé uniquement sur l'historique du tenant.
- **Validation de dose/posologie** — décision actée de ne jamais automatiser ça.
- **Autocomplete dans les templates** — le sélecteur de template charge déjà les données, pas besoin d'autocomplete.
- **Recherche par DCI** — le MVP cherche uniquement par nom commercial. La recherche par DCI pourra être ajoutée si le besoin est exprimé.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/app/api/medications/autocomplete/route.ts` | Endpoint GET suggestions de médicaments |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx` | Props, état autocomplete, dropdown, debounce |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | Passer `tenantId` à PrescriptionForm |

---

## Règles obligatoires

1. **Design system** : tokens sémantiques pour le dropdown.
2. **Pas de `any`** sans justification.
3. **Performance** : debounce 300ms sur la recherche, max 8 suggestions, limit=500 prescriptions.
4. **Accessibilité** : `autoComplete="off"` sur l'input, dropdown navigable au clavier ? (MVP : clic souris uniquement, navigation clavier pourra être ajoutée plus tard).
5. **Pas de logique clinique** dans les suggestions — ce n'est qu'un assistant de saisie.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `api/medications/autocomplete/route.ts` — endpoint
2. `PrescriptionForm.tsx` — state, search, dropdown UI
3. `patients/[id]/page.tsx` — passer `tenantId`
4. Build gate
