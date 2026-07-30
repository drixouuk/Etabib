# Fix A.2 — Audit log : non bloquant + couverture étendue

## Constat

**Fichier** : `apps/cms/src/hooks/logPatientAccess.ts`

1. **Bloquant sur chaque lecture** : `createAuditLog` fait `await req.payload.create(...)` dans un hook `afterRead` — chaque lecture de patient déclenche une écriture SQL synchrone avant de rendre la réponse. Risque de latence cumulative.
2. **Couvert uniquement sur `Patients`** : le hook est câblé uniquement dans `Patients.ts` (`afterRead` + `afterChange`). `Consultations`, `Prescriptions`, `Vaccinations` ne sont pas auditées, alors que ce sont des données cliniques tout aussi sensibles.

## AuditLogs — collection OK, ne pas toucher

La collection `audit-logs` (slug, fields, access immuable) est correcte. Aucune modification.

---

## Travail à faire

### 1. Rendre l'écriture d'audit non bloquante

**Fichier** : `apps/cms/src/hooks/logPatientAccess.ts`

Modifier `createAuditLog` pour ne pas bloquer la réponse :

```typescript
async function createAuditLog(req: any, action: string, collectionName: string, doc: any) {
  // Fire-and-forget : ne bloque pas la réponse HTTP
  req.payload.create({
    collection: 'audit-logs',
    data: {
      action,
      collectionName,
      documentId: doc.id as string,
      user: req.user.id,
      tenant:
        typeof req.user.tenant === 'object'
          ? (req.user.tenant as any).id
          : (req.user as any).tenant,
      timestamp: new Date().toISOString(),
    },
  }).catch((err: unknown) => {
    // Fallback : alerter sans bloquer
    writeAlert(req.payload, 'error', 'Échec d\'écriture audit-log', {
      action,
      collectionName,
      documentId: doc.id,
      error: String(err),
    })
  })
}
```

Le `await` est retiré — `.catch()` gère les erreurs silencieusement. Le `writeAlert` devient aussi fire-and-forget.

### 2. Généraliser les hooks pour accepter un nom de collection

Renommer les hooks exportés en versions génériques :

```typescript
export function auditReadHook(collectionName: string): CollectionAfterReadHook {
  return async ({ req, doc }) => {
    if (!req.user) return doc
    createAuditLog(req, 'read', collectionName, doc)
    return doc
  }
}

export function auditWriteHook(collectionName: string): CollectionAfterChangeHook {
  return async ({ req, doc }) => {
    if (!req.user) return doc
    createAuditLog(req, 'write', collectionName, doc)
    return doc
  }
}
```

Supprimer les exports `logPatientReadAccess` et `logPatientWriteAccess`.

### 3. Câbler sur Patients (mise à jour)

**Fichier** : `apps/cms/src/collections/Patients.ts`

Remplacer l'import et les hooks :

```typescript
// Avant :
import { logPatientReadAccess, logPatientWriteAccess } from '../hooks/logPatientAccess'
// Après :
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
```

Remplacer :
```typescript
afterRead: [logPatientReadAccess],
afterChange: [logPatientWriteAccess],
```
par :
```typescript
afterRead: [auditReadHook('patients')],
afterChange: [auditWriteHook('patients')],
```

### 4. Câbler sur Consultations

**Fichier** : `apps/cms/src/collections/Consultations.ts`

Ajouter l'import :

```typescript
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
```

Dans le `hooks` (après `beforeChange`), ajouter :

```typescript
afterRead: [auditReadHook('consultations')],
afterChange: [auditWriteHook('consultations')],
```

> Note : `Consultations` n'a actuellement pas de `afterRead` ni `afterChange`. Ajouter ces clés dans l'objet `hooks` existant.

### 5. Câbler sur Prescriptions

**Fichier** : `apps/cms/src/collections/Prescriptions.ts`

Même pattern :

```typescript
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
```

Ajouter dans `hooks` :

```typescript
afterRead: [auditReadHook('prescriptions')],
afterChange: [auditWriteHook('prescriptions')],
```

### 6. Câbler sur Vaccinations

**Fichier** : `apps/cms/src/collections/Vaccinations.ts`

Même pattern :

```typescript
import { auditReadHook, auditWriteHook } from '../hooks/logPatientAccess'
```

Ajouter dans `hooks` :

```typescript
afterRead: [auditReadHook('vaccinations')],
afterChange: [auditWriteHook('vaccinations')],
```

### 7. Vérifier les autres collections

`Documents` et `QueueItems` ne sont pas dans la liste minimale du document de cadrage, mais sont aussi des données cliniques. Les ajouter serait prudent mais pas bloquant pour ce lot. **Hors scope pour l'instant** — pourra être ajouté dans un lot ultérieur si besoin.

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/hooks/logPatientAccess.ts` | Rendre `createAuditLog` non bloquant + généraliser les hooks |
| `apps/cms/src/collections/Patients.ts` | Mise à jour import + hooks |
| `apps/cms/src/collections/Consultations.ts` | Ajouter `auditReadHook` + `auditWriteHook` |
| `apps/cms/src/collections/Prescriptions.ts` | Ajouter `auditReadHook` + `auditWriteHook` |
| `apps/cms/src/collections/Vaccinations.ts` | Ajouter `auditReadHook` + `auditWriteHook` |

## Fichiers à créer

Aucun.

## Fichiers à générer

Aucun (pas de changement de schéma, pas de migration).

---

## Règles obligatoires

1. **Pas de migration** — pas de changement de schéma de collection.
2. **Ne pas toucher à `AuditLogs.ts`** — la collection est correcte.
3. **Performance** : l'écriture d'audit ne doit pas ralentir la réponse HTTP.
4. **Pas de `any`** sans justification.
5. **Fire-and-forget** : utiliser `.catch()` pour ne jamais casser la réponse si l'audit échoue.

## Build gate

```bash
cd apps/cms && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `logPatientAccess.ts` — généraliser + non bloquant
2. `Patients.ts` — mise à jour import
3. `Consultations.ts` — câblage
4. `Prescriptions.ts` — câblage
5. `Vaccinations.ts` — câblage
6. Build gate
