# Feature A.3 — Module Vaccination : extensions ciblées

## Contexte

- `Vaccinations.ts`, `VaccineSchedule.ts` et `vaccination-utils.ts` existent déjà et la logique métier `overdue`/`upcoming` fonctionne.
- Trois ajouts manquants identifiés par le cadrage OpenEMR/DoliMed :
  1. **Numéro de lot** (`lotNumber`) — traçabilité du vaccin administré
  2. **Voie d'administration** (`administrationRoute`) — IM, SC, oral, intradermal
  3. **Statuts supplémentaires** `contraindicated` et `refused` — aujourd'hui seule l'administration est modélisée (enregistrement = vaccin fait). Pas de notion de refus parental ou de contre-indication médicale enregistrable.

## Impact sur la logique existante

Actuellement, la présence d'un enregistrement `Vaccination` pour un couple (vaccin, dose) signifie "administré". Avec les nouveaux statuts :
- `administered` (défaut) → comportement inchangé
- `contraindicated` → le vaccin est marqué comme non requis (contre-indication médicale). Il est exclus des alertes `overdue`/`upcoming`.
- `refused` → le vaccin est refusé par les parents. Il est aussi exclus des alertes.

---

## Travail à faire

### 1. CMS — Ajouter 3 champs à `Vaccinations`

**Fichier** : `apps/cms/src/collections/Vaccinations.ts`

#### 1a. Rendre `dateAdministered` optionnel

Modifier le champ existant (ligne ~90-96) :

```typescript
{
  name: 'dateAdministered',
  type: 'date',
  label: "Date d'administration",
  admin: { date: { pickerAppearance: 'dayOnly' } },
  // Plus de defaultValue ni required — optionnel car pas pertinent pour contraindicated/refused
},
```

#### 1b. Ajouter `status` (select)

Après `doseLabel`, ajouter :

```typescript
{
  name: 'status',
  type: 'select',
  defaultValue: 'administered',
  required: true,
  options: [
    { label: 'Administré', value: 'administered' },
    { label: 'Contre-indiqué', value: 'contraindicated' },
    { label: 'Refusé (parents)', value: 'refused' },
  ],
  label: 'Statut',
},
```

#### 1c. Ajouter `administrationRoute` (select)

```typescript
{
  name: 'administrationRoute',
  type: 'select',
  options: [
    { label: 'Intramusculaire (IM)', value: 'IM' },
    { label: 'Sous-cutanée (SC)', value: 'SC' },
    { label: 'Orale', value: 'oral' },
    { label: 'Intradermique', value: 'intradermal' },
  ],
  label: "Voie d'administration",
},
```

#### 1d. Ajouter `lotNumber` (text)

```typescript
{
  name: 'lotNumber',
  type: 'text',
  label: 'Numéro de lot',
},
```

**IMPORTANT** : migration Payload obligatoire :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 2. Mettre à jour `vaccination-utils.ts`

**Fichier** : `apps/frontend/src/lib/vaccination-utils.ts`

#### 2a. Mettre à jour le type `VaccinationData`

```typescript
export type VaccinationData = {
  id: string
  vaccineName: string
  doseLabel: string
  dateAdministered?: string | null
  status?: 'administered' | 'contraindicated' | 'refused'
}
```

#### 2b. Mettre à jour `computePatientAlerts`

Modifier la fonction `vaccinationDone` (ou la logique inline à la ligne 52) pour exclure les vaccinations non administrées :

```typescript
const done = vaccinations.some(
  (v) =>
    v.vaccineName === entry.vaccineName &&
    v.doseLabel === entry.doseLabel &&
    v.status !== 'contraindicated' &&
    v.status !== 'refused',
)
```

> Note : si `status` est absent (anciennes données avant migration), `v.status` est `undefined`, donc le vaccin est considéré comme "done" (rétrocompatibilité — les anciens enregistrements sans status étaient tous des administrations).

### 3. Mettre à jour `VaccinationRecord.tsx` (UI)

**Fichier** : `apps/frontend/src/components/dashboard/VaccinationRecord.tsx`

#### 3a. Mettre à jour le type `Vaccination`

```typescript
type Vaccination = {
  id: string
  vaccineName: string
  doseLabel: string
  dateAdministered?: string | null
  status?: 'administered' | 'contraindicated' | 'refused'
  lotNumber?: string
  administrationRoute?: string
}
```

#### 3b. Mettre à jour `vaccinationDone`

```typescript
const vaccinationDone = (entry: ScheduleEntry): Vaccination | undefined =>
  vaccinations.find((v) =>
    v.vaccineName === entry.vaccineName &&
    v.doseLabel === entry.doseLabel &&
    v.status !== 'contraindicated' &&
    v.status !== 'refused',
  )
```

Ajouter une fonction pour trouver les vaccinations avec statut spécial :

```typescript
const vaccinationExcluded = (entry: ScheduleEntry): Vaccination | undefined =>
  vaccinations.find((v) =>
    v.vaccineName === entry.vaccineName &&
    v.doseLabel === entry.doseLabel &&
    (v.status === 'contraindicated' || v.status === 'refused'),
  )
```

#### 3c. Ajouter une colonne "Voie" et "Lot" dans le tableau

Modifier le `<thead>` pour ajouter les colonnes :

```tsx
<th className="px-4 py-2.5 font-medium hidden md:table-cell">Voie</th>
<th className="px-4 py-2.5 font-medium hidden md:table-cell">Lot</th>
```

Modifier chaque `<tr>` pour afficher les données (masquées sur mobile) :

```tsx
<td className="px-4 py-2.5 text-stone-500 hidden md:table-cell">
  {done?.administrationRoute || '—'}
</td>
<td className="px-4 py-2.5 text-stone-500 hidden md:table-cell text-xs font-mono">
  {done?.lotNumber || '—'}
</td>
```

#### 3d. Ajouter les statuts spéciaux dans l'affichage

Modifier la logique de statut pour gérer `contraindicated` et `refused` :

```typescript
const excluded = vaccinationExcluded(entry)

if (excluded) {
  if (excluded.status === 'contraindicated') {
    statusIcon = <AlertCircle className="size-4 text-purple-500" />
    statusText = 'Contre-indiqué'
    statusColor = 'text-purple-600'
  } else {
    statusIcon = <AlertCircle className="size-4 text-stone-400" />
    statusText = 'Refusé'
    statusColor = 'text-stone-400'
  }
} else if (done) {
  // ... existant
} else if (isFuture) {
  // ... existant
} else {
  // ... existant
}
```

#### 3e. Ajouter les boutons "Contre-indiqué" et "Refusé"

À côté du bouton "Marquer comme administré" (ligne ~172), ajouter pour les vaccins non faits :

```tsx
{(isOverdue || (isFuture && !done && !excluded)) && !showForm && (
  <div className="flex items-center gap-1">
    <button
      onClick={() => { setActiveForm(key); setDateValue(new Date().toISOString().slice(0, 10)) }}
      className="rounded bg-primary-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-800"
    >
      Administré
    </button>
    <button
      onClick={async () => {
        const res = await fetch('/api/cms-proxy/vaccinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient: patientId,
            vaccineName: entry.vaccineName,
            doseLabel: entry.doseLabel,
            status: 'contraindicated',
          }),
        })
        if (res.ok) router.refresh()
      }}
      className="rounded border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-500 hover:text-stone-700"
    >
      Contre-indiqué
    </button>
    <button
      onClick={async () => {
        const res = await fetch('/api/cms-proxy/vaccinations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient: patientId,
            vaccineName: entry.vaccineName,
            doseLabel: entry.doseLabel,
            status: 'refused',
          }),
        })
        if (res.ok) router.refresh()
      }}
      className="rounded border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-500 hover:text-stone-700"
    >
      Refusé
    </button>
  </div>
)}
```

#### 3f. Ajouter lotNumber et administrationRoute au formulaire d'administration

Dans `handleSubmit`, ajouter les nouveaux champs au body :

```typescript
const body = {
  patient: patientId,
  vaccineName: entry.vaccineName,
  doseLabel: entry.doseLabel,
  dateAdministered: dateValue,
  status: 'administered',
  // les champs ci-dessous sont optionnels dans le formulaire
}
```

Ajouter des inputs dans le formulaire inline (après le `<input type="date">`) :

```tsx
<select
  value={routeValue}
  onChange={(e) => setRouteValue(e.target.value)}
  className="w-28 rounded border border-stone-300 px-2 py-1 text-xs focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
>
  <option value="">Voie...</option>
  <option value="IM">IM</option>
  <option value="SC">SC</option>
  <option value="oral">Orale</option>
  <option value="intradermal">ID</option>
</select>
<input
  type="text"
  value={lotValue}
  onChange={(e) => setLotValue(e.target.value)}
  placeholder="Lot"
  className="w-24 rounded border border-stone-300 px-2 py-1 text-xs focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
/>
```

Ajouter les états :

```typescript
const [routeValue, setRouteValue] = useState('')
const [lotValue, setLotValue] = useState('')
```

Et les passer dans le body du `handleSubmit` :

```typescript
administrationRoute: routeValue || undefined,
lotNumber: lotValue || undefined,
```

#### 3g. Rétrocompatibilité avec l'existant

- Si `status` est absent des données CMS (anciennes vaccinations), la fonction `vaccinationDone` les traite comme `administered` (comportement inchangé via `v.status !== 'contraindicated' && v.status !== 'refused'`).
- Les nouveaux champs `lotNumber` et `administrationRoute` sont optionnels → les anciennes vaccinations s'affichent avec "—".

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Vaccinations.ts` | Ajouter `status`, `administrationRoute`, `lotNumber` ; rendre `dateAdministered` optionnel |
| `apps/frontend/src/lib/vaccination-utils.ts` | Mettre à jour `VaccinationData` + exclure statuts spéciaux du `computePatientAlerts` |
| `apps/frontend/src/components/dashboard/VaccinationRecord.tsx` | Types, colonnes lot/voie, statuts CI/refusé, boutons, formulaire enrichi |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration Vaccinations | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après modification de collection CMS.
2. **Rétrocompatibilité** : les anciens enregistrements sans `status` sont considérés comme `administered`.
3. **Design system** : tokens sémantiques. Statut CI en violet (`purple-500`), refusé en gris (`stone-400`).
4. **Pas de `any`** sans justification.
5. **Pas de logique clinique automatique** dans les nouveaux champs.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `Vaccinations.ts` — champs + migration
2. `vaccination-utils.ts` — types + logique
3. `VaccinationRecord.tsx` — UI
4. Build gate
