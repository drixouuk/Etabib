# Issue : Recherche et filtre dans l'historique de consultations et prescriptions

## Contexte

- La fiche patient affiche jusqu'à 50 consultations et 50 prescriptions en ordre chronologique inverse.
- Aucun moyen de chercher une consultation spécifique par mot-clé ou date.
- Les données sont déjà chargées côté serveur (`depth=1`, `limit=50`). Le filtrage est **client-side**, pas de nouvel appel API.
- Même principe que la recherche patient déjà livrée, mais appliqué à l'historique local.

---

## Travail à faire

### 1. ConsultationForm — barre de recherche + filtre date

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx`

#### 1a. États de filtre

```tsx
const [filterQuery, setFilterQuery] = useState('')
const [filterDateFrom, setFilterDateFrom] = useState('')
const [filterDateTo, setFilterDateTo] = useState('')
```

#### 1b. Logique de filtrage

```tsx
const filteredConsultations = consultations.filter(c => {
  // Filtre texte (sur motif ET diagnostic, insensible à la casse)
  if (filterQuery.trim()) {
    const q = filterQuery.trim().toLowerCase()
    const inMotif = c.motif?.toLowerCase().includes(q)
    const inDiagnostic = c.diagnostic?.toLowerCase().includes(q)
    if (!inMotif && !inDiagnostic) return false
  }
  // Filtre date début
  if (filterDateFrom) {
    if (new Date(c.date) < new Date(filterDateFrom)) return false
  }
  // Filtre date fin
  if (filterDateTo) {
    const endOfDay = new Date(filterDateTo)
    endOfDay.setHours(23, 59, 59, 999)
    if (new Date(c.date) > endOfDay) return false
  }
  return true
})
```

#### 1c. UI — barre de filtres

Ajouter entre l'en-tête du composant et la liste des consultations (juste avant `{consultations.length === 0 ? ...}`) :

```tsx
{consultations.length > 0 && (
  <div className="border-b border-stone-100 px-4 py-3">
    <div className="flex flex-wrap items-end gap-2">
      {/* Recherche texte */}
      <div className="flex-1 min-w-[180px]">
        <label className="mb-0.5 block text-xs text-stone-500">Rechercher</label>
        <input
          type="text"
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          placeholder="Motif, diagnostic..."
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      </div>
      {/* Date début */}
      <div>
        <label className="mb-0.5 block text-xs text-stone-500">Du</label>
        <input
          type="date"
          value={filterDateFrom}
          onChange={e => setFilterDateFrom(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      </div>
      {/* Date fin */}
      <div>
        <label className="mb-0.5 block text-xs text-stone-500">Au</label>
        <input
          type="date"
          value={filterDateTo}
          onChange={e => setFilterDateTo(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      </div>
      {/* Bouton effacer */}
      {(filterQuery || filterDateFrom || filterDateTo) && (
        <button
          onClick={() => { setFilterQuery(''); setFilterDateFrom(''); setFilterDateTo('') }}
          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors duration-200"
        >
          Effacer
        </button>
      )}
    </div>
  </div>
)}
```

#### 1d. Remplacer `consultations` par `filteredConsultations`

Dans la section d'affichage (ligne ~195-196) :

```tsx
{filteredConsultations.length === 0 ? (
  <p className="px-4 py-6 text-center text-sm text-stone-400">
    {consultations.length > 0 ? 'Aucune consultation ne correspond à la recherche.' : 'Aucune consultation.'}
  </p>
) : (
  <div className="divide-y divide-stone-100">
    {filteredConsultations.map(c => (
```

Changer aussi le compteur `{consultations.length === 0 ?` en `{filteredConsultations.length === 0 ?`.

#### 1e. Compteur de résultats

Dans l'en-tête, afficher un compteur :

```tsx
<div className="flex items-center gap-2">
  <h2 className="font-heading text-lg font-semibold text-stone-800">Consultations</h2>
  {consultations.length > 0 && (
    <span className="text-xs text-stone-400">
      ({filteredConsultations.length}/{consultations.length})
    </span>
  )}
</div>
```

### 2. PrescriptionForm — barre de recherche + filtre date

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx`

Même pattern, adapté au type `Prescription` (champs : `medications[].nom`, `notes`).

#### 2a. États de filtre

```tsx
const [filterQuery, setFilterQuery] = useState('')
const [filterDateFrom, setFilterDateFrom] = useState('')
const [filterDateTo, setFilterDateTo] = useState('')
```

#### 2b. Logique de filtrage

```tsx
const filteredPrescriptions = prescriptions.filter(p => {
  if (filterQuery.trim()) {
    const q = filterQuery.trim().toLowerCase()
    const inMeds = p.medications?.some(m => m.nom?.toLowerCase().includes(q))
    const inNotes = p.notes?.toLowerCase().includes(q)
    if (!inMeds && !inNotes) return false
  }
  if (filterDateFrom && new Date(p.date) < new Date(filterDateFrom)) return false
  if (filterDateTo) {
    const endOfDay = new Date(filterDateTo)
    endOfDay.setHours(23, 59, 59, 999)
    if (new Date(p.date) > endOfDay) return false
  }
  return true
})
```

#### 2c. UI — barre de filtres

Identique à ConsultationForm, avec placeholder adapté : `"Médicament, notes..."`.

#### 2d. Compteur

```tsx
<span className="text-xs text-stone-400">
  ({filteredPrescriptions.length}/{prescriptions.length})
</span>
```

---

## Ce qui est hors scope

- **Recherche dans l'examen clinique** — le champ `examenClinique` est un textarea long, pas pertinent pour une recherche rapide.
- **Tri personnalisé** (ascendant/descendant, tri par motif) — l'ordre chronologique inverse reste le défaut.
- **Filtre par praticien** — pertinent seulement en tier `clinique`, viendra avec le besoin.

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx` | États filtre + barre UI + `filteredConsultations` |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx` | États filtre + barre UI + `filteredPrescriptions` |

## Fichiers à créer

Aucun.

---

## Règles obligatoires

1. **Design system** : tokens sémantiques pour les inputs.
2. **Pas de `any`**.
3. **Client-side uniquement** — pas de nouvel appel API. Le filtrage se fait sur les données déjà chargées (`limit=50` max).
4. **Compteur visible** — `(3/15)` pour montrer combien de résultats vs total.
5. **Message adapté** — si filtres actifs et 0 résultat : "Aucune consultation ne correspond à la recherche." (pas "Aucune consultation").

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `ConsultationForm.tsx` — filtre + UI
2. `PrescriptionForm.tsx` — filtre + UI
3. Build gate
