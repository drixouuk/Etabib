# Fix #1 — Formulaire de contact cassé (aucune donnée envoyée)

## Finding

`ContactForm.tsx` : le `handleSubmit` fait juste `e.preventDefault(); setSent(true)`. Aucun appel réseau. L'utilisateur remplit, clique, voit "Message envoyé" — rien n'est stocké ni transmis. Impact production immédiat sur le site public de Dr. Guinane.

## Correctif

**Fichier** : `apps/frontend/src/components/ui/ContactForm.tsx`

Remplacer le `handleSubmit` vide par un POST vers l'API CMS. Stocker les messages dans une nouvelle collection `ContactMessages` (ou réutiliser une collection existante).

### Approche : créer une collection CMS légère `contact-messages`

Pas de nouvelle collection — garder simple. Envoyer via l'API onboarding (déjà publique) avec un endpoint dédié, ou utiliser un webhook simple.

**Solution la plus simple** : utiliser un endpoint API existant ou créer un `POST /api/contact` minimal.

### Option A : endpoint dédié (recommandé)

**Créer** `apps/frontend/src/app/api/contact/route.ts` :

```typescript
import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://dr-pediatre-cms.vercel.app'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, message } = body

  if (!name || !phone || !message) {
    return NextResponse.json({ error: 'Champs requis' }, { status: 400 })
  }

  // Créer une entrée dans une collection CMS (utiliser une collection existante ou en créer une)
  // Pour l'instant, forwarder vers un endpoint CMS qui stocke
  const res = await fetch(`${CMS_URL}/api/contact-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, message }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Créer** `apps/cms/src/collections/ContactMessages.ts` :

```typescript
import type { CollectionConfig } from 'payload'

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'createdAt'],
    group: 'Public',
  },
  access: {
    create: () => true,   // public
    read: ({ req: { user } }) => !!user,  // authenticated only
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nom' },
    { name: 'phone', type: 'text', required: true, label: 'Téléphone' },
    { name: 'message', type: 'textarea', required: true, label: 'Message' },
  ],
}
```

**Modifier** `ContactForm.tsx` — `handleSubmit` :

```typescript
const [name, setName] = useState('')
const [phone, setPhone] = useState('')
const [message, setMessage] = useState('')
const [sending, setSending] = useState(false)
const [error, setError] = useState('')

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setSending(true)
  setError('')
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), message: message.trim() }),
    })
    if (!res.ok) throw new Error()
    setSent(true)
  } catch {
    setError(t('send_error') || 'Erreur lors de l\'envoi. Veuillez réessayer.')
  }
  setSending(false)
}
```

Ajouter `value` + `onChange` sur les 3 inputs existants.

**Enregistrer** la collection dans `apps/cms/src/payload.config.ts`.

**Migration** : `pnpm --filter cms payload migrate:create && pnpm --filter cms payload migrate`.

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/ContactMessages.ts` | Créer |
| `apps/cms/src/payload.config.ts` | Enregistrer |
| `apps/frontend/src/app/api/contact/route.ts` | Créer |
| `apps/frontend/src/components/ui/ContactForm.tsx` | États + handleSubmit réel |

## Build gate

```bash
cd apps/cms && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit && npx next build
```
