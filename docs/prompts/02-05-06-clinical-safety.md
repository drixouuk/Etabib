# Fix #2, #5, #6 — Sécurité clinique + erreurs silencieuses + confirmation suppression

## #2 — Autocomplete : ne plus pré-remplir posologie/durée

**Fichier** : `apps/frontend/src/app/api/medications/autocomplete/route.ts`

Le fix : ne plus inclure `posologie` et `duree` dans les suggestions. Garder uniquement `nom` et `dci`.

**Modifications** :

1. Simplifier le type de suggestion (ligne ~37) :
```typescript
const seen = new Map<string, { nom: string; dci: string; count: number }>()
```

2. Ne plus stocker `posologie`/`duree` :
```typescript
if (!seen.has(key)) {
  seen.set(key, { nom: m.nom.trim(), dci: m.dci?.trim() || '', count: 1 })
} else {
  const entry = seen.get(key)!
  entry.count++
}
```

3. Dans `PrescriptionForm.tsx` — mettre à jour le type `MedicationSuggestion` :
```typescript
type MedicationSuggestion = { nom: string; dci: string; count: number }
```

4. Dans le `onMouseDown` du dropdown — ne plus auto-remplir `posologie` et `duree` :
```typescript
onMouseDown={(e) => {
  e.preventDefault()
  updateMed(i, 'nom', s.nom)
  updateMed(i, 'dci', s.dci)
  // posologie et duree ne sont PLUS pré-remplies
  setOpenDropdown(null)
}}
```

**Fichiers à modifier pour #2** :
- `apps/frontend/src/app/api/medications/autocomplete/route.ts`
- `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx`

---

## #5 — Gestion d'erreur sur échec de sauvegarde (4 formulaires)

Ajouter `else` avec affichage d'erreur sur les formulaires suivants. Pattern à suivre : `AddToQueueButton.tsx` (lignes 44-47).

### 5a. `ConsultationForm.tsx`

Après `if (res.ok) { ... }` (ligne ~56), ajouter :
```typescript
else {
  setError("Erreur lors de l'enregistrement. Veuillez réessayer.")
}
setSaving(false)
```

Ajouter l'état : `const [error, setError] = useState('')`

Afficher l'erreur dans le footer du formulaire (après les boutons) :
```tsx
{error && <p className="text-sm text-red-600">{error}</p>}
```

Réinitialiser `setError('')` en début de `handleSubmit`.

### 5b. `PrescriptionForm.tsx`

Même pattern. État `error`, affichage dans le footer, `setError('')` au début de `handleSubmit`.

### 5c. `PatientClinicalFields.tsx`

Ajouter `const [error, setError] = useState('')`. Dans `handleSave` :
```typescript
if (res.ok) {
  setSaved(true)
  router.refresh()
} else {
  setError("Erreur lors de l'enregistrement. Veuillez réessayer.")
}
setSaving(false)
```

Afficher `{error && <p className="text-sm text-red-600">{error}</p>}` à côté du bouton.

### 5d. `DocumentUpload.tsx`

Vérifier si le composant a déjà une gestion d'erreur. Si non, ajouter le même pattern.

**Fichiers à modifier pour #5** :
- `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PrescriptionForm.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/PatientClinicalFields.tsx`
- `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/DocumentUpload.tsx`

---

## #6 — Confirmation de suppression patient : afficher le nom + avertissement

**Fichier** : `apps/frontend/src/components/dashboard/PatientDeleteButton.tsx`

### Modifications

Remplacer le texte de confirmation générique "Confirmer ?" par un message incluant le nom du patient et l'avertissement de perte de données :

```tsx
{confirming && (
  <div className="px-3 py-2">
    <p className="text-sm text-red-700 font-medium">
      Supprimer {patientName} ?
    </p>
    <p className="text-xs text-stone-500 mt-1">
      L'historique clinique (consultations, prescriptions, vaccinations, documents) sera définitivement perdu.
    </p>
    <div className="flex items-center gap-1 mt-2">
      <button onClick={handleDelete} disabled={deleting}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
        {deleting ? 'Suppression…' : 'Supprimer définitivement'}
      </button>
      <button onClick={() => { setConfirming(false); setError('') }}
        className="text-sm text-stone-400 hover:text-stone-600">
        Annuler
      </button>
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)}
```

---

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```
