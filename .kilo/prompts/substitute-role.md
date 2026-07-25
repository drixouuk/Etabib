# Issue : Rôle "remplaçant" temporaire à accès limité

## Contexte

- Rôles existants : `superadmin`, `tenant_admin`, `doctor`, `secretary`.
- Le rôle `secretary` a des droits limités (pas d'accès au dossier clinique, pas de consultations/prescriptions).
- Besoin : un médecin remplaçant (le Dr. X remplace Dr. Guinane pendant ses congés) doit avoir les mêmes droits qu'un `doctor`, mais **avec une date d'expiration**. Passé cette date, l'accès est bloqué automatiquement.
- Pattern fréquent au Maroc : médecin en congés, remplaçant temporaire.
- Pas de mécanisme d'expiration existant dans `Users`.

---

## Architecture

```
Création du compte remplaçant (par tenant_admin)
  → Users.create({ roles: ['substitute'], accessExpiresAt: '2026-08-31', tenant: ... })

Connexion (login route)
  → Vérifie si user.roles.includes('substitute') && accessExpiresAt < now
  → Si expiré : bloque la connexion avec message "Accès expiré depuis le XX/XX/XXXX"

Navigation (requireAuth)
  → Vérifie si user.roles.includes('substitute') && accessExpiresAt < now
  → Si expiré mid-session : redirige vers /login
```

---

## Travail à faire

### 1. CMS — Ajouter `substitute` au rôle + champ `accessExpiresAt`

**Fichier** : `apps/cms/src/collections/Users.ts`

#### 1a. Ajouter `substitute` aux options de rôle

Ligne ~70, modifier l'array `options` de `roles` :

```typescript
options: ['superadmin', 'tenant_admin', 'doctor', 'secretary', 'substitute'],
```

#### 1b. Ajouter le champ `accessExpiresAt`

Après le champ `tenant` (ligne ~88), ajouter :

```typescript
{
  name: 'accessExpiresAt',
  type: 'date',
  label: "Date d'expiration de l'accès",
  admin: {
    date: { pickerAppearance: 'dayOnly' },
    description: 'Pour les comptes remplaçants. Après cette date, la connexion est bloquée.',
    condition: (data: any) => {
      const roles: string[] = data?.roles ?? []
      return roles.includes('substitute')
    },
  },
},
```

- Le champ n'est visible dans l'admin que si le rôle `substitute` est coché.
- Pas de `required` — optionnel, mais fortement recommandé pour les remplaçants.
- Si absent → accès permanent (fallback pour éviter de bloquer un compte par erreur).

**IMPORTANT** : migration Payload obligatoire :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 2. Route login — bloquer si expiré

**Fichier** : `apps/frontend/src/app/api/auth/login/route.ts`

Après avoir récupéré le `json` de la réponse CMS (ligne 19), ajouter la vérification :

```typescript
const user = json.user

// Bloquer les comptes remplaçants expirés
if (user?.roles?.includes('substitute') && user?.accessExpiresAt) {
  const expiresAt = new Date(user.accessExpiresAt)
  if (expiresAt < new Date()) {
    const dateStr = expiresAt.toLocaleDateString('fr-FR')
    return NextResponse.json(
      { error: `Votre accès remplaçant a expiré le ${dateStr}. Contactez le médecin titulaire.` },
      { status: 403 },
    )
  }
}
```

### 3. Fonction `requireAuth` — bloquer mid-session si expiré

**Fichier** : `apps/frontend/src/lib/auth.ts`

#### 3a. Mettre à jour le type `PayloadUser`

```typescript
export type PayloadUser = {
  id: string
  email: string
  name: string
  roles: string[]
  tenant?: string | { id: string }
  doctorProfile?: string | { id: string; name?: string; specialty?: string } | null
  accessExpiresAt?: string | null  // ← ajouter
}
```

#### 3b. Vérifier l'expiration dans `requireAuth`

```typescript
export async function requireAuth(): Promise<PayloadUser> {
  const user = await authenticate()
  if (!user) {
    redirect('/login')
  }
  // Bloquer les remplaçants expirés
  if (user.roles?.includes('substitute') && user.accessExpiresAt) {
    if (new Date(user.accessExpiresAt) < new Date()) {
      // Supprimer le cookie pour forcer une nouvelle authentification
      const cookieStore = await cookies()
      cookieStore.delete('payload-token')
      redirect('/login')
    }
  }
  return user
}
```

Note : `requireAuth` est appelée dans le dashboard layout et sur chaque page praticien → le blocage est effectif sur toute navigation post-expiration.

### 4. Sidebar — afficher la date d'expiration

**Fichier** : `apps/frontend/src/components/dashboard/Sidebar.tsx`

Dans la section info utilisateur (en bas de la sidebar), si l'utilisateur est `substitute` et a une date d'expiration, afficher un message :

```tsx
{user.roles?.includes('substitute') && user.accessExpiresAt && (
  <p className="mt-1 text-xs text-warning">
    Accès jusqu'au {new Date(user.accessExpiresAt).toLocaleDateString('fr-FR')}
  </p>
)}
```

Placer ce message sous le `roleLabel` (ligne ~99 du fichier actuel).

### 5. Rétrocompatibilité — ne pas casser les comptes existants

- Le champ `accessExpiresAt` est optionnel (pas de `required: true`).
- Si absent → pas de blocage (les comptes non-remplaçants ne sont pas affectés).
- Les comptes `doctor`, `secretary`, `tenant_admin` existants ne sont pas impactés.

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Users.ts` | Ajouter `substitute` au rôle + champ `accessExpiresAt` |
| `apps/frontend/src/app/api/auth/login/route.ts` | Blocage connexion si remplaçant expiré |
| `apps/frontend/src/lib/auth.ts` | Type `PayloadUser` + blocage mid-session |
| `apps/frontend/src/components/dashboard/Sidebar.tsx` | Afficher date d'expiration |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration Users | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après modification de collection CMS.
2. **Rétrocompatibilité** : le champ `accessExpiresAt` est optionnel. Si absent, aucun blocage.
3. **Sécurité** : le blocage se fait côté serveur (login route + requireAuth), pas côté client uniquement.
4. **Design system** : utiliser `text-warning` pour la date d'expiration.
5. **Pas de `any`** sans justification.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `Users.ts` — rôle + champ + migration
2. `auth.ts` — type + requireAuth
3. `login/route.ts` — blocage connexion
4. `Sidebar.tsx` — affichage date
5. Build gate
