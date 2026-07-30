# Feature : Page Paramètres — mot de passe & gestion des comptes

## Contexte

- Aucune page "paramètres" n'existe dans le dashboard.
- Le médecin ne peut pas changer son mot de passe ni celui de sa secrétaire sans passer par l'admin CMS (Payload admin panel) — auquel la secrétaire n'a pas accès.
- Il ne peut pas non plus modifier son nom, email ou téléphone professionnel affiché sur le site public.
- Payload expose `PATCH /api/users/:id` pour modifier nom, email, mot de passe. Le user peut PATCH son propre compte. Pour gérer les autres comptes, le `tenant_admin` a besoin de l'accès `update` sur la collection `Users` (actuellement non défini).
- Le téléphone est stocké dans le global `PracticeInfo` (accessible via `POST /api/globals/practice-info`).

---

## Travail à faire

### 1. CMS — Ajouter `update` access sur Users

**Fichier** : `apps/cms/src/collections/Users.ts`

Ajouter après `read` (ligne 33) :

```typescript
update: ({ req: { user }, id }: any) => {
  const roles: string[] = user?.roles ?? []
  // Superadmin peut tout
  if (roles.includes('superadmin')) return true
  // L'utilisateur peut modifier son propre compte
  if (user?.id === id) return true
  // Tenant_admin peut modifier les utilisateurs de son tenant
  if (roles.includes('tenant_admin')) {
    const callerTenantId = typeof user.tenant === 'object' ? user.tenant.id : user.tenant
    if (!callerTenantId) return false
    // Vérifier que la cible appartient au même tenant
    return {
      tenant: { equals: callerTenantId },
    }
  }
  return false
},
```

**Ne pas oublier la migration** : `pnpm --filter cms payload migrate:create && pnpm --filter cms payload migrate`

### 2. Sidebar — ajouter icône "Paramètres"

**Fichier** : `apps/frontend/src/components/dashboard/Sidebar.tsx`

Ajouter `Settings` à l'import lucide-react :

```tsx
import { ..., Settings, LogOut } from 'lucide-react'
```

Dans la section footer (entre le bloc user info et le formulaire logout, ligne ~95), ajouter :

```tsx
<Link
  href="/dashboard/settings"
  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors duration-200 hover:bg-cream-200 hover:text-stone-700"
  onClick={onNavigate}
>
  <Settings className="size-4" />
  Paramètres
</Link>
```

> Note : `Link` est déjà importé dans `SidebarNav.tsx` via `@/i18n/navigation`. Il faut l'importer aussi dans `Sidebar.tsx` (ou passer `onNavigate` comme pour les autres liens via `SidebarNav`).

**Option plus simple** : intégrer le lien "Paramètres" directement dans `SidebarNav` via les `navItems` ou `adminItems`, plutôt que de le mettre dans le footer.

**Recommandé** : l'ajouter comme dernier élément de `navItems` (après "Rendez-vous") :

```tsx
{ label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
```

### 3. Page Paramètres

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx`

Page serveur avec deux sections (via composants clients) :

```tsx
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import ProfileEditor from './ProfileEditor'
import ChangePasswordForm from './ChangePasswordForm'
import ManageAccounts from './ManageAccounts'

export default async function SettingsPage() {
  const user = await requireAuth()
  const isAdmin = user.roles?.includes('tenant_admin') || user.roles?.includes('superadmin')
  const tenantId = typeof user.tenant === 'object' ? (user.tenant as any).id : user.tenant

  // Fetch des infos du global PracticeInfo pour le téléphone
  let practicePhone = ''
  if (tenantId) {
    const practiceRes = await fetchCMS<{ phone?: string }>(
      `/api/globals/practice-info?depth=0`,
      { revalidate: 0 },
    )
    practicePhone = practiceRes?.phone || ''
  }

  let tenantUsers: { id: string; email: string; name: string; roles: string[] }[] = []
  if (isAdmin && tenantId) {
    const res = await fetchCMS<{ docs: { id: string; email: string; name: string; roles: string[] }[] }>(
      `/api/users?where[tenant][equals]=${tenantId}&depth=0&limit=50`,
      { revalidate: 0 },
    )
    tenantUsers = res?.docs ?? []
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-stone-800">Paramètres</h1>
      <div className="mt-8 space-y-8">
        <ProfileEditor
          userId={user.id}
          initialName={user.name || ''}
          initialEmail={user.email}
          initialPhone={practicePhone}
        />
        <ChangePasswordForm userId={user.id} />
        {isAdmin && <ManageAccounts users={tenantUsers} currentUserId={user.id} />}
      </div>
    </div>
  )
}
```

### 4. Composant ProfileEditor

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ProfileEditor.tsx`

```tsx
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  userId: string
  initialName: string
  initialEmail: string
  initialPhone: string
}

export default function ProfileEditor({ userId, initialName, initialEmail, initialPhone }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalide.')
      return
    }

    setSaving(true)

    // PATCH nom + email sur l'utilisateur
    const userRes = await fetch(`/api/cms-proxy/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    })

    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}))
      setError(errData?.errors?.[0]?.message || 'Erreur lors de la mise à jour du profil.')
      setSaving(false)
      return
    }

    // POST le téléphone sur le global PracticeInfo
    const phoneRes = await fetch('/api/cms-proxy/globals/practice-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    })

    if (!phoneRes.ok) {
      setError('Profil mis à jour, mais erreur sur le téléphone.')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    router.refresh()
  }

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Mon profil</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Nom</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Téléphone professionnel</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className={inputClass} placeholder="+212 ..." />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Profil mis à jour avec succès.</p>}
        <button type="submit" disabled={saving}
          className="self-start rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}
```

### 5. Composant ChangePasswordForm

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ChangePasswordForm.tsx`

```tsx
'use client'

import { useState, FormEvent } from 'react'

type Props = { userId: string }

export default function ChangePasswordForm({ userId }: Props) {
  const [current, setCurrent] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSaving(true)
    const res = await fetch(`/api/cms-proxy/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    if (res.ok) {
      setSuccess(true)
      setCurrent('')
      setNewPassword('')
      setConfirm('')
    } else {
      setError('Erreur lors du changement de mot de passe.')
    }
    setSaving(false)
  }

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Changer mon mot de passe</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Nouveau mot de passe</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            required minLength={8} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">Confirmer le mot de passe</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            required className={inputClass} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Mot de passe modifié avec succès.</p>}
        <button type="submit" disabled={saving}
          className="self-start rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  )
}
```

### 6. Composant ManageAccounts

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ManageAccounts.tsx`

```tsx
'use client'

import { useState } from 'react'

type User = { id: string; email: string; name: string; roles: string[] }

type Props = { users: User[]; currentUserId: string }

export default function ManageAccounts({ users, currentUserId }: Props) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Comptes du cabinet</h2>
      </div>
      <div className="divide-y divide-stone-100">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800">
                {u.name || u.email}
                {u.id === currentUserId && <span className="ml-2 text-xs text-stone-400">(vous)</span>}
              </p>
              <p className="text-xs text-stone-500">
                {u.email} — {u.roles.map(r => {
                  const labels: Record<string, string> = {
                    superadmin: 'Super admin', tenant_admin: 'Admin', doctor: 'Médecin', secretary: 'Secrétaire', substitute: 'Remplaçant'
                  }
                  return labels[r] || r
                }).join(', ')}
              </p>
            </div>
            <ResetPasswordButton userId={u.id} userName={u.name || u.email} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [showForm, setShowForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleReset = async () => {
    if (newPassword.length < 8) { setError('Minimum 8 caractères'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/cms-proxy/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    if (res.ok) {
      setDone(true)
      setShowForm(false)
      setNewPassword('')
      setTimeout(() => setDone(false), 3000)
    } else {
      setError('Erreur lors du changement de mot de passe.')
    }
    setSaving(false)
  }

  if (showForm) {
    return (
      <div className="flex items-center gap-2">
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="Nouveau MDP" minLength={8}
          className="w-36 rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none" />
        <button onClick={handleReset} disabled={saving}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50">
          OK
        </button>
        <button onClick={() => setShowForm(false)}
          className="text-sm text-stone-400 hover:text-stone-600">✕</button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {done && <span className="text-xs text-green-600">Modifié ✓</span>}
      <button onClick={() => setShowForm(true)}
        className="text-sm font-medium text-primary-600 hover:text-primary-700">
        Réinitialiser MDP
      </button>
    </div>
  )
}
```

---

## Règles obligatoires

1. **`update` access CMS** : bien vérifier que `tenant_admin` peut PATCH uniquement les users de son tenant (pas cross-tenant).
2. **Migration obligatoire** après modification de `Users.ts`.
3. **Design system** : tokens sémantiques, `rounded-lg`, `duration-200`.
4. **Pas de `any`** sans justification.
5. **Sécurité** : le formulaire "Changer mon mot de passe" utilise `PATCH /api/cms-proxy/users/<mon-id>`. Le bouton "Réinitialiser MDP" utilise `PATCH /api/cms-proxy/users/<target-id>`. Les deux passent par le proxy CMS qui transmet le cookie `payload-token` → le CMS vérifie les droits via l'access control.

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx` | Page serveur |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ProfileEditor.tsx` | Formulaire profil (nom, email, téléphone) |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ChangePasswordForm.tsx` | Formulaire mot de passe |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/ManageAccounts.tsx` | Gestion des comptes |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Users.ts` | Ajouter `update` access |
| `apps/frontend/src/components/dashboard/Sidebar.tsx` | Ajouter icône "Paramètres" |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration Users | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

## Build gate

```bash
cd apps/cms && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit && npx next build
```
