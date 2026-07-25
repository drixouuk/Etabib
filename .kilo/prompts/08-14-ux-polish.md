# Fix #8, #9, #10, #11, #12, #13, #14 — Polish UX

---

## #8 — "Terminer" une consultation : undo temporaire

**Fichier** : `apps/frontend/src/components/dashboard/WaitingRoomList.tsx`

**Problème** : clic "Terminer" sans confirmation. La liste se rafraîchit toutes les 15s, risque de clic erroné, surtout sur mobile.

**Correctif** : après clic "Terminer", afficher un bandeau "Patient terminé — Annuler" pendant 5 secondes. Si "Annuler" est cliqué, restaurer le statut `in_consultation`.

Ajouter un état :

```typescript
const [undoItem, setUndoItem] = useState<QueueItem | null>(null)
const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null)
```

Modifier `updateStatus` pour gérer l'undo :

```typescript
const updateStatus = async (id: string, currentStatus: string) => {
  const nextStatus = transitionMap[currentStatus]
  if (!nextStatus) return

  const body: Record<string, string> = { status: nextStatus }
  if (nextStatus === 'waiting') body.arrivalTime = new Date().toISOString()

  const res = await fetch(`/api/cms-proxy/queue-items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.ok) {
    // Si on vient de terminer → activer l'undo
    if (nextStatus === 'completed') {
      const item = items.find(i => i.id === id)
      if (item) {
        setUndoItem(item)
        const timeout = setTimeout(() => setUndoItem(null), 5000)
        setUndoTimeout(timeout)
      }
    }
    router.refresh()
    fetchQueue()
  }
}

// Fonction undo
const undoComplete = async () => {
  if (!undoItem) return
  if (undoTimeout) clearTimeout(undoTimeout)
  await fetch(`/api/cms-proxy/queue-items/${undoItem.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_consultation' }),
  })
  setUndoItem(null)
  router.refresh()
  fetchQueue()
}
```

Afficher le bandeau undo en haut de la liste :

```tsx
{undoItem && (
  <div className="flex items-center justify-between bg-primary-50 px-4 py-2 text-sm">
    <span className="text-primary-700">
      {undoItem.patient?.fullName} — consultation terminée
    </span>
    <button onClick={undoComplete} className="font-medium text-primary-700 hover:text-primary-800 underline">
      Annuler
    </button>
  </div>
)}
```

---

## #9 — Remplacer `prompt()` par une modale inline pour nommer un modèle

**Fichiers** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationForm.tsx` + `PrescriptionForm.tsx`

**Problème** : `prompt("Nom du modèle :")` casse le design system et bloque le thread.

**Correctif** : remplacer par un petit champ inline + bouton.

Ajouter un état :

```typescript
const [templateName, setTemplateName] = useState('')
const [showTemplateSave, setShowTemplateSave] = useState(false)
```

Remplacer le bouton "Sauvegarder comme modèle" par un toggle qui affiche un mini-formulaire :

```tsx
{!showTemplateSave ? (
  <button type="button" onClick={() => setShowTemplateSave(true)}
    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
    Sauvegarder comme modèle
  </button>
) : (
  <div className="flex items-center gap-2">
    <input
      value={templateName}
      onChange={e => setTemplateName(e.target.value)}
      placeholder="Nom du modèle"
      className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
      autoFocus
    />
    <button type="button" onClick={async () => {
      if (!templateName.trim()) return
      setSavingTemplate(true)
      // ... POST vers /api/cms-proxy/templates (même code qu'avant, mais avec templateName)
      setShowTemplateSave(false)
      setTemplateName('')
      setSavingTemplate(false)
    }} disabled={savingTemplate || !templateName.trim()}
      className="rounded-lg bg-primary-700 px-3 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
      Enregistrer
    </button>
    <button type="button" onClick={() => { setShowTemplateSave(false); setTemplateName('') }}
      className="text-sm text-stone-500 hover:text-stone-700">
      Annuler
    </button>
  </div>
)}
```

Appliquer le même pattern dans **PrescriptionForm.tsx**.

---

## #10 — Grille stats page Activité non responsive

**Fichier** : `apps/frontend/src/components/dashboard/ActivityView.tsx`

Remplacer `grid grid-cols-3 gap-4` par `grid grid-cols-1 sm:grid-cols-3 gap-4`.

---

## #11 — Alerte proactive expiration remplaçant (2h avant)

**Fichier** : `apps/frontend/src/components/dashboard/Sidebar.tsx`

Ajouter un bandeau warning visible quand l'expiration approche (moins de 2h) :

```tsx
{user.roles?.includes('substitute') && user.accessExpiresAt && (() => {
  const expiresAt = new Date(user.accessExpiresAt)
  const hoursLeft = (expiresAt.getTime() - Date.now()) / 3600000
  if (hoursLeft > 0 && hoursLeft <= 2) {
    return (
      <p className="mt-1 text-xs font-medium text-warning bg-warning/10 rounded px-2 py-1">
        Expire dans {hoursLeft < 1 ? `${Math.round(hoursLeft * 60)} min` : `${Math.round(hoursLeft)}h`}
      </p>
    )
  }
  return null
})()}
```

---

## #12 — Lien "Voir le tableau de bord" mal routé

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/AddToQueueButton.tsx`

Ligne ~57, remplacer `href="/dashboard"` par `href="/dashboard/queue"`.

---

## #13 — Tier affiché en jargon interne

**Fichier** : `apps/frontend/src/components/dashboard/Sidebar.tsx`

Ajouter un mapping comme `roleLabels` :

```typescript
const tierLabels: Record<string, string> = {
  vitrine: 'Site vitrine',
  rdv: 'RDV en ligne',
  dossier: 'Cabinet individuel',
  clinique: 'Cabinet de groupe',
}
```

Remplacer l'affichage brut (ligne ~62) :

```tsx
{tenant && <p className="mt-0.5 text-xs text-stone-500">{tierLabels[tenant.settings?.activeTier || ''] || tenant.settings?.activeTier}</p>}
```

---

## #14 — En-tête fiche patient : séparer identité et coordonnées

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

Remplacer la ligne dense actuelle (lignes ~132-146) par deux groupes distincts :

```tsx
<div className="mt-1 space-y-1 text-sm">
  {/* Identité */}
  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-stone-500">
    <span>CIN : {patient.nationalId || 'Non renseigné'}</span>
    {patient.birthDate && (
      <>
        <span>Né(e) le {new Date(patient.birthDate).toLocaleDateString('fr-FR')}</span>
        <span className="font-medium text-stone-700">{computeAge(patient.birthDate)}</span>
      </>
    )}
  </div>
  {/* Coordonnées */}
  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-stone-500">
    {patient.address && <span>{patient.address}</span>}
    {patient.phone && <span>{patient.phone}</span>}
    {patient.email && <span>{patient.email}</span>}
    <span className="text-stone-400">Créé le {new Date(patient.createdAt).toLocaleDateString('fr-FR')}</span>
  </div>
</div>
```

---

## Fichiers récapitulatif

| # | Fichier | Action |
|---|---------|--------|
| 8 | `WaitingRoomList.tsx` | Undo temporaire après "Terminer" |
| 9 | `ConsultationForm.tsx` | Remplacer prompt() par champ inline |
| 9 | `PrescriptionForm.tsx` | Idem |
| 10 | `ActivityView.tsx` | `grid-cols-1 sm:grid-cols-3` |
| 11 | `Sidebar.tsx` | Bandeau expiration < 2h |
| 12 | `AddToQueueButton.tsx` | `/dashboard` → `/dashboard/queue` |
| 13 | `Sidebar.tsx` | Traduire `activeTier` → label humain |
| 14 | `patients/[id]/page.tsx` | Séparer identité / coordonnées |

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```
