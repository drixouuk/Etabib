# Fix #3, #4 — Onboarding : capture de lead + sélecteur de spécialité

## #4 — Sélecteur de spécialité inaccessible (bug de séquencement)

**Fichier** : `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`

### Problème

`handleTierClick` fait `setStep(2)` immédiatement pour dossier/clinique. Le sélecteur de spécialité n'est rendu que si `step === 0`, donc il n'est jamais visible.

### Correctif

Ne pas changer de step dans `handleTierClick`. Le sélecteur de spécialité s'affiche après sélection du tier, puis un bouton "Continuer" passe à l'étape suivante.

```typescript
const handleTierClick = (slug: string) => {
  setSelectedTier(slug)
  // NE PLUS changer de step ici
}

// Nouvelle fonction :
const handleContinue = () => {
  if (selectedTier === 'dossier' || selectedTier === 'clinique') {
    setStep(2)  // → écran de contact
  } else {
    setStep(1)  // → formulaire d'inscription
  }
}
```

### UI — bouton "Continuer" sous le sélecteur

Remplacer le bloc conditionnel du sélecteur (lignes 127-142) par :

```tsx
{selectedTier && (
  <div className="mt-6 flex flex-col items-center gap-4">
    {/* Sélecteur de spécialité (uniquement pour dossier/clinique) */}
    {(selectedTier === 'dossier' || selectedTier === 'clinique') && (
      <div className="w-full max-w-xs">
        <label className="mb-1 block text-sm font-medium text-stone-700">
          Votre spécialité
        </label>
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        >
          <option value="pediatrie">Pédiatrie</option>
          <option value="generaliste">Médecine générale</option>
          <option value="gynecologie">Gynécologie</option>
          <option value="dermatologie">Dermatologie</option>
          <option value="autre">Autre</option>
        </select>
      </div>
    )}
    <button
      onClick={handleContinue}
      className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 transition-colors duration-200"
    >
      Continuer
    </button>
  </div>
)}
```

### Conséquence sur #7

Une fois le sélecteur accessible, l'indicateur d'étape (#7) redevient cohérent (step 0 → step 1 ou 2). Pas de correctif séparé nécessaire pour #7.

---

## #3 — Onboarding "Nous contacter" : capturer les données du prospect

**Fichier** : `apps/frontend/src/components/onboarding/OnboardingFlow.tsx`

### Problème

Quand dossier/clinique est sélectionné → écran de remerciement statique, aucune collecte de données. Le lead est perdu.

### Correctif

Remplacer l'écran de contact actuel (étape 2 pour dossier/clinique) par un mini-formulaire de contact avant la confirmation.

Ajouter des états :

```typescript
const [contactName, setContactName] = useState('')
const [contactPhone, setContactPhone] = useState('')
const [contactEmail, setContactEmail] = useState('')
const [contactSending, setContactSending] = useState(false)
const [contactSent, setContactSent] = useState(false)
```

Remplacer le bloc `{step === 2 && isContact && selected && (` par :

```tsx
{step === 2 && isContact && selected && !contactSent && (
  <div className="mx-auto max-w-md">
    <div className="mb-6 text-center">
      <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
        {selected.name} — {selected.price} MAD/mois
      </span>
      <span className="ml-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
        {selectedSpecialty === 'pediatrie' ? 'Pédiatrie' :
         selectedSpecialty === 'generaliste' ? 'Médecine générale' :
         selectedSpecialty === 'gynecologie' ? 'Gynécologie' :
         selectedSpecialty === 'dermatologie' ? 'Dermatologie' : 'Autre'}
      </span>
    </div>

    <h2 className="font-heading text-xl font-bold text-stone-800 text-center">
      Demander une démo
    </h2>
    <p className="mt-2 text-sm text-stone-500 text-center">
      Laissez-nous vos coordonnées, nous vous recontacterons sous 48h.
    </p>

    <form onSubmit={async (e) => {
      e.preventDefault()
      setContactSending(true)
      try {
        // Envoyer via le même endpoint que le formulaire de contact public
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: contactName.trim(),
            phone: contactPhone.trim(),
            message: `Demande de démo — Formule ${selected.name} — Spécialité ${selectedSpecialty} — Email : ${contactEmail.trim()}`,
          }),
        })
        setContactSent(true)
      } catch {}
      setContactSending(false)
    }} className="mt-6 space-y-4">
      <input value={contactName} onChange={e => setContactName(e.target.value)}
        placeholder="Votre nom" required
        className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
      <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
        placeholder="Téléphone" type="tel" required
        className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
      <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
        placeholder="Email" type="email" required
        className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
      <button type="submit" disabled={contactSending}
        className="w-full rounded-lg bg-primary-700 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
        {contactSending ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
    </form>

    <button onClick={() => { setStep(0); setSelectedTier(null) }}
      className="mt-4 w-full text-sm text-stone-500 hover:text-stone-700">
      Choisir une autre formule
    </button>
  </div>
)}
```

Puis l'écran de confirmation existant reste pour `contactSent === true` (le bloc actuel avec "Demande envoyée").

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/components/onboarding/OnboardingFlow.tsx` | #4 : fix séquencement + #3 : formulaire contact |

---

## Dépendance

Le #3 utilise `POST /api/contact` — dépend du prompt `01-contact-form-fix.md` (endpoint + collection ContactMessages). Si #1 n'est pas encore fait, remplacer temporairement par un `console.log` ou un stockage local le temps que #1 soit déployé.

---

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```
