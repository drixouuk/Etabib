# Issue : Lien `Doctors` ↔ `Users`

## Contexte

- `Users` et `Doctors` sont deux collections **indépendantes** aujourd'hui. Seul lien : `tenant`.
- Le seed crée un User (`Dr Guinane Aicha`, `drixou@proton.me`) et un Doctor (`Dr Guinane Aicha`) — même personne, mais **pas liés**.
- `Consultations.practitioner` et `Prescriptions.practitioner` pointent vers `Users`, pas `Doctors`. À l'affichage, on voit `practitioner.name` (User), ce qui tombe juste parce que le seed aligne les noms. Mais architecturalement c'est fragile.
- Le lien est requis pour le tier `clinique` (#3) : plusieurs médecins par tenant, chacun avec sa file et ses consultations. Sans lien User→Doctor, impossible de rattacher une consultation à un médecin spécifique.
- La décision technique : ajouter un champ côté Users uniquement (`Users.doctorProfile` → relation vers Doctors). La jointure inverse se fait par query `where[doctorProfile][equals]=...`. Pas besoin de champ côté Doctors.

## Travail à faire

### 1. CMS — Ajouter `Users.doctorProfile`

**Fichier** : `apps/cms/src/collections/Users.ts`

Dans l'array `fields`, après le champ `tenant`, ajouter :

```typescript
{
  name: 'doctorProfile',
  type: 'relationship',
  relationTo: 'doctors',
  label: 'Fiche médecin associée',
  admin: {
    description: 'Lie ce compte utilisateur à sa fiche Doctors (permet consultation par Dr. X, file par médecin, etc.)',
    condition: (data: any) => {
      const roles: string[] = data?.roles ?? []
      return roles.includes('doctor')
    },
  },
},
```

Points :
- `optional` par défaut (pas de `required: true`) — rétrocompatibilité avec les tenants `dossier`
- Conditionné à `doctor` dans le rôle — les `secretary` et `superadmin` n'ont pas de fiche médecin
- Pas de `unique` — plusieurs Users doctor pourraient pointer vers le même Doctor (cas rare mais possible si comptes multiples)

**IMPORTANT** : migration Payload obligatoire :

```bash
pnpm --filter cms payload migrate:create
pnpm --filter cms payload migrate
```

### 2. Types frontend — `PayloadUser`

**Fichier** : `apps/frontend/src/lib/auth.ts`

Dans le type `PayloadUser`, ajouter `doctorProfile` (optionnel, car pas tous les users sont doctors) :

```typescript
export type PayloadUser = {
  id: string
  email: string
  name?: string | null
  roles: string[]
  tenant: string | { id: string }
  doctorProfile?: string | { id: string; name?: string; specialty?: string } | null
}
```

Ou si le type est déjà défini autrement, adapter. Vérifier le fichier pour le format exact.

### 3. Seed — Lier le User médecin à sa fiche Doctor

**Fichier** : `apps/cms/src/seed.ts`

Actuellement, `seedDoctorUser()` crée le User, puis plus tard `seedDoctorProfile()` crée le Doctor. Il faut lier les deux.

Modifier la fonction `seedDoctorProfile()` (ou le flux qui l'appelle) pour qu'après création du Doctor, on mette à jour le User correspondant :

```typescript
// Après création du doctor (ligne ~155), ajouter :
const doctorUser = await payload.find({
  collection: 'users',
  where: { email: { equals: DOCTOR_EMAIL } },
  limit: 1,
})
if (doctorUser.docs.length > 0) {
  await payload.update({
    collection: 'users',
    id: doctorUser.docs[0].id,
    data: { doctorProfile: doctor.id },
  })
  console.log('✅ User lié à sa fiche médecin')
}
```

Ou plus propre : retourner l'ID doctor depuis `seedDoctorProfile()` et faire le lien dans la fonction `seed()` principale.

### 4. Vérification types Payload générés

**Fichier** : `apps/cms/payload-types.ts`

Après migration, le type `User` doit inclure `doctorProfile`. Vérifier que le fichier est régénéré automatiquement ou le mettre à jour manuellement.

### 5. Vérification — pas de régression sur l'affichage existant

Les composants suivants affichent `practitioner.name` sur les consultations/prescriptions :

- `ConsultationForm.tsx:142` : `{c.practitioner?.name || c.practitioner?.email || '—'}`
- `PrescriptionForm.tsx:181` : `{p.practitioner?.name || p.practitioner?.email || '—'}`

Ces affichages utilisent `User.name` (pas `Doctor.name`). Après lien, `User.name` reste inchangé ("Dr Guinane Aicha"). **Pas de modification nécessaire** sur ces composants dans ce chantier. Le lien servira pour le chantier #3 (filtrage par médecin, affichage enrichi).

---

## Ce qui est hors scope

- **Affichage de `Doctor.specialty` dans les consultations** — viendra avec #3
- **Filtrage des consultations par médecin** — viendra avec #3
- **Création automatique d'un Doctor à l'onboarding** — le flux onboarding actuel crée un User avec `fullName` mais pas de Doctor record. Ce sera traité quand l'onboarding dossier/clinique passera en self-service.
- **Champ côté `Doctors`** — pas nécessaire, la jointure inverse se fait en query

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/cms/src/collections/Users.ts` | Ajouter champ `doctorProfile` (relationship → doctors, conditionné au rôle `doctor`) |
| `apps/frontend/src/lib/auth.ts` | Mettre à jour type `PayloadUser` avec `doctorProfile?` |
| `apps/cms/src/seed.ts` | Après création Doctor, lier le User via `doctorProfile` |

## Fichiers à générer

| Fichier | Commande |
|---------|----------|
| Migration `doctorProfile` | `pnpm --filter cms payload migrate:create` puis `pnpm --filter cms payload migrate` |

---

## Règles obligatoires

1. **Migration obligatoire** après modification de collection CMS.
2. **Rétrocompatibilité** : `doctorProfile` est optionnel. Les tenants `dossier` existants (un seul médecin) fonctionnent sans lien.
3. **Pas de `any`** sans justification.
4. **Design system** — pas impacté (pas d'UI nouvelle).

## Build gate

```bash
cd apps/cms && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `Users.ts` — ajout champ + migration CMS
2. `auth.ts` — mise à jour type `PayloadUser`
3. `seed.ts` — lien User → Doctor
4. Build gate
