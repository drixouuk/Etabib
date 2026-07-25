# Issue — LOT 4 : Composants shadcn (Avatar/Tabs/Sheet/Badge) + refonte fiche patient

## Contexte

- Le style shadcn `base-nova` est déjà configuré (`components.json`). Tokens CSS déjà mappés sur la charte dans `globals.css`.
- Seuls `button`, `card`, `dropdown-menu` sont installés dans `src/components/ui`. Ce lot ajoute `avatar`, `tabs`, `sheet`, `badge`.
- Le champ `gender` existe déjà sur `Patients` (`'boy' | 'girl'`). **Aucune migration, aucun changement Payload.**
- Passe de présentation/structure uniquement. La logique de fetch et les formulaires existants ne changent pas.

---

## Étape 1 — Installer les primitives shadcn manquantes

```bash
pnpm dlx shadcn@latest add tabs sheet avatar badge
```

Ne pas toucher `components.json`.

## Étape 2 — Composant `PatientAvatar`

**Fichier à créer** : `apps/frontend/src/components/dashboard/PatientAvatar.tsx`

```tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type Props = {
  fullName: string
  gender?: 'boy' | 'girl' | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function PatientAvatar({ fullName, gender, size = 'md', className = '' }: Props) {
  const bgColor =
    gender === 'girl' ? 'bg-avatar-girl' :
    gender === 'boy' ? 'bg-avatar-boy' :
    'bg-stone-300'

  return (
    <Avatar className={`${SIZE_CLASSES[size]} ${bgColor} ${className}`}>
      <AvatarFallback className="text-white font-bold">
        {getInitials(fullName)}
      </AvatarFallback>
    </Avatar>
  )
}
```

**Ajouter dans `globals.css`**, sous le bloc `@theme` existant (ligne ~63) :

```css
--color-avatar-boy: #5B87A6;
--color-avatar-girl: #C97B85;
```

> Tons volontairement désaturés pour rester cohérents avec la charte — pas de bleu/rose vifs.

## Étape 3 — Liste patients : remplacer l'affichage du nom par Avatar + badge consultation

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/page.tsx`

### 3a. Import

```tsx
import PatientAvatar from '@/components/dashboard/PatientAvatar'
import { Badge } from '@/components/ui/badge'
```

### 3b. Colonne "Nom"

Remplacer le contenu actuel de la colonne (ligne ~134-143) par :

```tsx
<td className="px-4 py-3">
  <div className="flex items-center gap-3">
    <PatientAvatar fullName={p.fullName} gender={p.gender as 'boy' | 'girl' | null} size="sm" />
    <div>
      <div className="flex items-center gap-2">
        <PatientActionsDropdown patientId={p.id} patientName={p.fullName} />
        <Link
          href={`/dashboard/patients/${p.id}`}
          className="font-medium text-stone-800 hover:text-primary-600 transition-colors duration-200"
        >
          {p.fullName}
        </Link>
      </div>
    </div>
  </div>
</td>
```

### 3c. Colonne "Dernière consultation"

Remplacer l'affichage actuel (ligne ~149-151) par :

```tsx
<td className="px-4 py-3 text-stone-500">
  {lastConsultations[p.id] ? (
    <Badge variant={isRecent(lastConsultations[p.id]) ? 'default' : 'secondary'}>
      {new Date(lastConsultations[p.id]).toLocaleDateString('fr-FR')}
    </Badge>
  ) : '—'}
</td>
```

Ajouter la fonction `isRecent` dans le composant :

```typescript
function isRecent(iso: string): boolean {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return new Date(iso) >= thirtyDaysAgo
}
```

## Étape 4 — Fiche patient : réorganiser en onglets + bannière allergie

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx`

> **IMPORTANT** : les composants importés (`PatientClinicalFields`, `GrowthChart`, `ConsultationForm`, `PrescriptionForm`, `DocumentUpload`, `VaccinationRecord`, `ReferringPractitionersWidget`, `SharePatientWidget`) **ne changent pas en interne**. Seul leur emplacement/wrapper change.

### 4a. Imports ajoutés

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PatientAvatar from '@/components/dashboard/PatientAvatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
```

### 4b. En-tête compact

Remplacer le bloc en-tête actuel (ligne ~130-147) par :

```tsx
<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
  <div className="flex items-center gap-4">
    <PatientAvatar fullName={patient.fullName} gender={patient.gender as 'boy' | 'girl' | null} size="lg" />
    <div>
      <h1 className="font-heading text-3xl font-bold text-stone-800">{patient.fullName}</h1>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-stone-500">
        {patient.nationalId && <span>CIN : {patient.nationalId}</span>}
        {patient.birthDate && (
          <>
            <span>Né(e) le {new Date(patient.birthDate).toLocaleDateString('fr-FR')}</span>
            <span className="font-medium text-stone-700">{computeAge(patient.birthDate)}</span>
          </>
        )}
        {patient.phone && <span>{patient.phone}</span>}
      </div>
      <div className="mt-0.5 text-sm text-stone-500">
        {patient.address && <span>{patient.address}</span>}
        {patient.email && <span className="ml-3">{patient.email}</span>}
      </div>
    </div>
  </div>
  <AddToQueueButton patientId={patient.id} />
</div>
```

Supprimer les blocs `AddToQueueButton` et `PatientClinicalFields` en dehors des onglets (ils étaient en dehors, lignes ~149-159).

### 4c. Bandeau allergie conditionnel

```tsx
{patient.allergies?.trim() && (
  <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
    <AlertCircle className="size-5 shrink-0 text-red-500" />
    Allergie connue : {patient.allergies} — à vérifier avant toute prescription
  </div>
)}
```

Ajouter `AlertCircle` à l'import lucide-react.

### 4d. Structure en onglets

Remplacer tout le JSX après la bannière par :

```tsx
<Tabs defaultValue="resume" className="mt-2">
  <TabsList className="mb-6">
    <TabsTrigger value="resume">Résumé</TabsTrigger>
    <TabsTrigger value="dossier">Dossier clinique</TabsTrigger>
    <TabsTrigger value="croissance">Croissance</TabsTrigger>
    <TabsTrigger value="consultations">Consultations & ordonnances</TabsTrigger>
    <TabsTrigger value="documents">Documents</TabsTrigger>
  </TabsList>

  <TabsContent value="resume">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-stone-400">Dernière consultation</p>
        {consultations.length > 0 ? (
          <>
            <p className="mt-1 font-heading text-lg font-bold text-stone-800">
              {new Date(consultations[0].date).toLocaleDateString('fr-FR')}
            </p>
            <p className="text-sm text-stone-500">{consultations[0].motif || 'Consultation'}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-stone-400">Aucune consultation</p>
        )}
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-stone-400">Croissance</p>
        {consultations.length > 0 && consultations[0].poids ? (
          <>
            <p className="mt-1 font-heading text-lg font-bold text-stone-800">
              {consultations[0].poids} kg
            </p>
            {consultations[0].taille && (
              <p className="text-sm text-stone-500">{consultations[0].taille} cm</p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-stone-400">Pas de mesure</p>
        )}
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase text-stone-400">Traitement en cours</p>
        {patient.traitementsEnCours?.trim() ? (
          <p className="mt-1 text-sm text-stone-700 line-clamp-2">{patient.traitementsEnCours}</p>
        ) : (
          <p className="mt-1 text-sm text-stone-400">Aucun traitement en cours</p>
        )}
      </div>
    </div>
    {/* Widgets existants (ReferringPractitioners, SharePatient) hors onglets */}
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {tenant && <ReferringPractitionersWidget patientId={patient.id} initialIds={referringIds} />}
      {isClinique && isDoctor && (
        <SharePatientWidget
          patientId={patient.id}
          sharedWithIds={sharedWithIds}
          followedByIds={followedByIds}
          isClinique={isClinique}
          currentUserId={user.id}
        />
      )}
    </div>
  </TabsContent>

  <TabsContent value="dossier">
    <PatientClinicalFields
      patientId={patient.id}
      initialData={canViewClinical ? {
        medicalNotes: patient.medicalNotes,
        antecedents: patient.antecedents,
        allergies: patient.allergies,
        traitementsEnCours: patient.traitementsEnCours,
      } : null}
    />
  </TabsContent>

  <TabsContent value="croissance">
    {canViewClinical && isPediatrie && <GrowthChart consultations={consultations} patientBirthDate={patient.birthDate} patientGender={patient.gender} />}
    {canViewClinical && isPediatrie && (
      <VaccinationRecord
        patientId={patient.id}
        schedule={vaccineSchedule}
        vaccinations={patientVaccinations}
        patientGender={patient.gender}
        patientBirthDate={patient.birthDate}
      />
    )}
  </TabsContent>

  <TabsContent value="consultations">
    {canViewClinical && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Consultation : bouton ouvrant un Sheet */}
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h2 className="font-heading text-lg font-semibold text-stone-800">Consultations</h2>
            <Sheet>
              <SheetTrigger className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800">
                + Nouvelle consultation
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-[640px] sm:min-w-[420px] overflow-y-auto">
                <ConsultationForm patientId={patient.id} consultations={consultations} isPediatrie={isPediatrie} doctorInfo={doctorInfo} patientInfo={patientInfo} />
              </SheetContent>
            </Sheet>
          </div>
          {/* Historique des consultations */}
          <ConsultationHistory consultations={consultations} doctorInfo={doctorInfo} patientInfo={patientInfo} />
        </div>

        {/* Ordonnance : bouton ouvrant un Sheet */}
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h2 className="font-heading text-lg font-semibold text-stone-800">Ordonnances</h2>
            <Sheet>
              <SheetTrigger className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800">
                + Nouvelle ordonnance
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-[640px] sm:min-w-[420px] overflow-y-auto">
                <PrescriptionForm patientId={patient.id} prescriptions={prescriptions} consultations={consultations} tenantId={tenantId} doctorInfo={doctorInfo} patientInfo={patientInfo} />
              </SheetContent>
            </Sheet>
          </div>
          {/* Historique des ordonnances */}
          <PrescriptionHistory prescriptions={prescriptions} doctorInfo={doctorInfo} patientInfo={patientInfo} />
        </div>
      </div>
    )}
  </TabsContent>

  <TabsContent value="documents">
    {canViewClinical && (
      <div className="mb-8">
        <DocumentUpload patientId={patient.id} documents={documents} />
      </div>
    )}
  </TabsContent>
</Tabs>
```

### 4e. Extraction des historiques en composants

**IMPORTANT** : `ConsultationForm.tsx` contient actuellement à la fois le formulaire ET l'historique. Il faut **scinder le composant** :

1. `ConsultationForm` devient uniquement le formulaire (supprimer la section historique du composant)
2. **Nouveau fichier** `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/ConsultationHistory.tsx` — contient la liste filtrée des consultations passées (le JSX de l'actuel `ConsultationForm` après la fermeture du formulaire, lignes ~193-237)

Même chose pour `PrescriptionForm` :
1. `PrescriptionForm` devient uniquement le formulaire
2. **Nouveau fichier** `PrescriptionHistory.tsx` — liste filtrée des prescriptions passées

> **Note pour l'agent** : le filtre de recherche, le compteur, et les boutons PDF/WhatsApp restent dans les composants History. Le `Sheet` contient uniquement le formulaire (pas l'historique).

---

## Règles obligatoires

1. **Zéro migration Payload**. Aucune collection modifiée.
2. **Design system** : tokens sémantiques. Les nouveaux composants shadcn utilisent les tokens existants.
3. **RTL** : vérifier que `Sheet` s'ouvre du bon côté selon la direction (`side="right"` devient automatiquement `left` en RTL via shadcn).
4. **Pas de `any`** non justifié.
5. **Pas de régression** sur les flux existants (file d'attente, création patient).
6. **Husky pre-commit** ne doit rien bloquer.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `pnpm dlx shadcn@latest add tabs sheet avatar badge`
2. `globals.css` — ajouter `--color-avatar-boy` / `--color-avatar-girl`
3. `PatientAvatar.tsx` — composant
4. `patients/page.tsx` — avatar + badge dans le tableau
5. `patients/[id]/page.tsx` — onglets + en-tête + bannière allergie
6. `ConsultationHistory.tsx` + `PrescriptionHistory.tsx` — extraction des historiques
7. `ConsultationForm.tsx` + `PrescriptionForm.tsx` — retirer les sections historique
8. Build gate
