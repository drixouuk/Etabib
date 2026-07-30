# Issue : Refonte Dashboard — File d'attente dédiée, Vue d'ensemble, Activité

## Contexte

- **Bug identifié** : dans `Sidebar.tsx`, "Vue d'ensemble" et "File d'attente" pointent toutes les deux vers `/dashboard`. Le lien "File d'attente" doit pointer vers sa propre page `/dashboard/queue`.
- La page `/dashboard` actuelle mélange stats + file d'attente dans un rôle "fourre-tout". Il faut la refondre en vraie **Vue d'ensemble**.
- Nouvelle page **Activité** (stats de consultations et nouveaux patients) à créer.
- `LiveStatsWidget.tsx` et `WaitingRoomList.tsx` violent le design system (couleurs Tailwind brutes au lieu des tokens sémantiques `primary-*`, `stone-*`, `cream-*`).

---

## Travail à faire

### 1. Correction Sidebar (`components/dashboard/Sidebar.tsx`)

- Changer le lien "File d'attente" : `href="/dashboard"` → `href="/dashboard/queue"`
- Ajouter une entrée **"Activité"** avec `href="/dashboard/activity` entre "File d'attente" et "Rendez-vous"
- Icône pour "Activité" : `BarChart3` de `lucide-react`
- Icône pour "File d'attente" : `ListOrdered` de `lucide-react` (remplacer l'icône actuelle si elle n'est pas parlante)
- S'assurer que l'état actif fonctionne correctement pour les sous-routes (`/dashboard/queue`, `/dashboard/activity`) — utiliser `usePathname` avec `startsWith` si ce n'est pas déjà fait

### 2. Page File d'attente (`app/[locale]/(dashboard)/dashboard/queue/page.tsx`)

Créer une page dédiée qui reprend les composants existants :

```tsx
import { requireAuth } from '@/lib/auth'
import LiveStatsWidget from '@/components/dashboard/LiveStatsWidget'
import WaitingRoomList from '@/components/dashboard/WaitingRoomList'

export default async function QueuePage() {
  await requireAuth()
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">File d'attente</h1>
      <LiveStatsWidget />
      <WaitingRoomList />
    </div>
  )
}
```

### 3. Refonte Vue d'ensemble (`app/[locale]/(dashboard)/dashboard/page.tsx`)

Remplacer le contenu actuel par une vraie page de synthèse avec 4 zones :

#### 3a. Barre de recherche patient
- Champ texte avec placeholder "Rechercher un patient (nom ou CIN)..."
- Au submit (GET), rediriger vers `/dashboard/patients?q=<recherche>`
- Icône `Search` de lucide-react
- Style : input avec `rounded-lg`, bordure `border-stone-200`, focus `ring-primary-500`

#### 3b. Stats cliquables
- Réutiliser la logique de `LiveStatsWidget` (4 compteurs : Programmés, Salle d'attente, En consultation, Terminés aujourd'hui)
- MAIS rendre chaque carte cliquable : clic → navigation vers `/dashboard/queue`
- Ajouter `cursor-pointer` et un effet hover (`hover:shadow-md`, `hover:border-primary-200`)
- Utiliser `<Link href="/dashboard/queue">` autour de chaque carte

#### 3c. Aperçu compact de la file d'attente
- Afficher les 5 premiers patients dans la file (status `waiting` ou `in_consultation`), triés par `arrivalTime` ascendant
- Pour chaque patient : avatar genré (rose pour `girl`, bleu pour `boy`), nom, âge, motif de visite (badge), badge statut
- En bas : lien "Voir toute la file d'attente →" pointant vers `/dashboard/queue`
- Faire un composant serveur avec `fetchCMS` (pas de polling — c'est un aperçu instantané)

#### 3d. Widget rappels vaccinaux
- **Objectif** : afficher la liste des patients ayant des vaccins en retard ou à venir dans les 30 jours
- **Logique métier** (dans un composant serveur) :
  1. Récupérer tous les patients du tenant (`/api/patients?limit=500`)
  2. Récupérer le calendrier vaccinal (`/api/vaccine-schedule?sort=ageMonths&limit=100`, `revalidate: 60`)
  3. Récupérer toutes les vaccinations du tenant (`/api/vaccinations?limit=1000`)
  4. Pour chaque patient, calculer son âge en mois (`computeAgeMonths` depuis `lib/age.ts` ou équivalent)
  5. Pour chaque vaccin du calendrier dont `ageMonths <= âgePatient + 1` (tolérance 1 mois), vérifier si le patient a reçu ce vaccin (match `vaccineName` + `doseLabel`)
  6. Si le vaccin n'a pas été administré ET `âgePatient >= ageMonths` → "En retard"
  7. Si le vaccin n'a pas été administré ET `âgePatient < ageMonths <= âgePatient + 30 jours` → "À venir"
  8. Grouper par patient, afficher jusqu'à 10 patients
- **Affichage** : carte avec titre "Rappels vaccinaux", badge "En retard" (rouge/`destructive`) ou "À venir" (ambre/`warning`), nom du patient (cliquable → `/dashboard/patients/[id]`), liste des vaccins concernés
- Si 0 patient concerné : message "Tous les patients sont à jour ✓" (vert)
- Si le tenant n'a pas de patients : "Aucun patient enregistré"

#### 3e. Liens rapides (conservés de l'existant)
- Boutons : "Patients", "Registre d'audit", "Alertes système" (superadmin seulement)
- Conserver la structure existante

### 4. Nouvelle page Activité (`app/[locale]/(dashboard)/dashboard/activity/page.tsx`)

#### 4a. Sélecteur de période
- Trois boutons : Jour | Semaine | Mois (actif par défaut : Semaine)
- Style : boutons groupés style "segmented control", fond `bg-stone-100`, actif `bg-white shadow-sm`
- Au clic, mettre à jour la date de début/fin et refetcher les données

#### 4b. Compteurs
- **Nouveaux patients** : nombre de patients créés dans la période (`createdAt >= startDate`)
- **Consultations réalisées** : nombre de consultations dans la période (`date >= startDate`)
- Affichage : deux cartes côte à côte (`grid-cols-2`), avec icône (`UserPlus` et `Stethoscope`), chiffre en grand, label en dessous

#### 4c. Graphique consultations par jour
- Données : consultations groupées par jour, comptage par jour
- Graphique : `BarChart` recharts, barres avec `fill={PRIMARY}` (`#0F766E`), axe X = dates (format `d/m`), axe Y = nombre
- Hauteur : 250px dans `ResponsiveContainer`

#### 4d. Graphique nouveaux patients par jour
- Données : patients groupés par jour de création
- Graphique : `LineChart` recharts, ligne `stroke={SECONDARY}` (`#D97706`), mêmes axes
- Hauteur : 250px

#### 4e. Gestion des données
- Faire un **composant serveur** qui fetch les données via `fetchCMS`
- Passer `?where[createdAt][greater_than_equal]=<ISO>&limit=500` pour patients
- Passer `?where[date][greater_than_equal]=<ISO>&limit=500` pour consultations
- Le groupement par jour/semaine/mois se fait dans une fonction utilitaire côté serveur
- Calcul de la date de début selon la période :
  - Jour : début du jour courant (`new Date().setHours(0,0,0,0)`)
  - Semaine : lundi 00:00 de la semaine courante
  - Mois : 1er du mois courant 00:00

#### 4f. Composant client pour l'interaction période
- Le sélecteur de période est un composant client (`'use client'`)
- Utiliser `useState` pour `period` ('day' | 'week' | 'month')
- Utiliser `useRouter` + `useSearchParams` pour refléter la période dans l'URL (`?period=week`)
- Ou alternative : faire 3 pages statiques avec `generateStaticParams` → non, utiliser plutôt des query params et un seul composant

#### 4g. Implémentation recommandée
```
Page serveur → lit searchParams.period → calcule startDate → fetch données → 
passe data + period à un composant client ActivityView
ActivityView = sélecteur période + compteurs + graphiques (tout client-side car recharts)
```

### 5. Fixes Design System

**Règle** : `design-system/MASTER.md` impose les tokens sémantiques (`primary-*`, `stone-*`, `cream-*`, `secondary-*`, `cta-*`, couleurs sémantiques `success`/`error`/`warning`/`info`). **Jamais de couleurs Tailwind brutes** (`text-blue-600`, `bg-pink-100`, `text-sky-700`, `bg-amber-50`, `text-amber-600`, etc.).

#### 5a. `LiveStatsWidget.tsx`
Remplacer :
- `text-blue-600 bg-blue-50` → `text-primary-600 bg-primary-50` (pour "Programmés")
- `text-amber-600 bg-amber-50` → utiliser `bg-warning/10 text-warning` (défini dans `globals.css` : `--warning: #D97706`)
- `text-emerald-600 bg-emerald-50` → `text-primary-700 bg-primary-50` (pour "En consultation")
- `text-stone-600 bg-stone-50` → `text-stone-600 bg-stone-100` (pour "Terminés")

#### 5b. `WaitingRoomList.tsx`
Remplacer :
- `bg-pink-100 text-pink-800` → `bg-cta/10 text-cta` (pour filles) — ou créer un token `--color-patient-girl` si plus propre
- `bg-sky-100 text-sky-700` → `bg-primary/10 text-primary-700` (pour garçons)
- Badges de statut :
  - "Salle d'attente" : `bg-warning/10 text-warning border-warning/20`
  - "En consultation" : `bg-primary/10 text-primary-700 border-primary/20`
- Badges de motif :
  - `consultation` : `bg-stone-100 text-stone-700`
  - `controle` : `bg-info/10 text-info`
  - `vaccin` : `bg-secondary/10 text-secondary-700`
  - `urgence` : `bg-error/10 text-error`

### 6. Internationalisation (i18n)

Tous les nouveaux textes UI doivent aller dans `messages/fr.json`, `messages/en.json`, `messages/ar.json`, `messages/tzm.json`.

Nouvelles clés à ajouter :

```json
{
  "dashboard": {
    "overview": "Vue d'ensemble",
    "queue": "File d'attente",
    "activity": "Activité",
    "welcome": "Bonjour, {name}",
    "searchPatient": "Rechercher un patient (nom ou CIN)...",
    "quickLinks": "Accès rapides",
    "patients": "Patients",
    "auditLogs": "Registre d'audit",
    "systemAlerts": "Alertes système",
    "stats": {
      "scheduled": "Programmés",
      "waiting": "Salle d'attente",
      "inConsultation": "En consultation",
      "completedToday": "Terminés aujourd'hui"
    },
    "queuePreview": {
      "title": "En attente",
      "empty": "Aucun patient en attente",
      "viewAll": "Voir toute la file d'attente"
    },
    "vaccinationWidget": {
      "title": "Rappels vaccinaux",
      "allUpToDate": "Tous les patients sont à jour",
      "noPatients": "Aucun patient enregistré",
      "overdue": "En retard",
      "upcoming": "À venir",
      "vaccines": "vaccins"
    },
    "activity": {
      "title": "Activité",
      "period": {
        "day": "Jour",
        "week": "Semaine",
        "month": "Mois"
      },
      "newPatients": "Nouveaux patients",
      "consultationsDone": "Consultations réalisées",
      "consultationsChart": "Consultations par jour",
      "patientsChart": "Nouveaux patients par jour",
      "noData": "Aucune donnée pour cette période"
    }
  }
}
```

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/components/dashboard/Sidebar.tsx` | Modifier : liens corrigés + nouvelle entrée Activité |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/page.tsx` | Refonte complète (remplacer le contenu) |
| `apps/frontend/src/components/dashboard/LiveStatsWidget.tsx` | Modifier : tokens design system + rendre les cartes cliquables (nouveau prop `clickable?: boolean`) |
| `apps/frontend/src/components/dashboard/WaitingRoomList.tsx` | Modifier : tokens design system |

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/queue/page.tsx` | Page file d'attente dédiée |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx` | Page activité (serveur, fetch données) |
| `apps/frontend/src/components/dashboard/ActivityView.tsx` | Composant client : sélecteur période + graphiques |
| `apps/frontend/src/components/dashboard/QueuePreview.tsx` | Composant serveur : aperçu compact file d'attente |
| `apps/frontend/src/components/dashboard/VaccinationAlerts.tsx` | Composant serveur : widget rappels vaccinaux |
| `apps/frontend/src/components/dashboard/PatientSearchBar.tsx` | Composant client : barre de recherche patient |
| `apps/frontend/src/lib/vaccination-utils.ts` | Fonctions utilitaires : calcul des vaccins en retard (partagées avec VaccinationRecord) |

## Fichiers à modifier (i18n)

| Fichier | Action |
|---------|--------|
| `apps/frontend/messages/fr.json` | Ajouter les clés `dashboard.*` |
| `apps/frontend/messages/en.json` | Ajouter les mêmes clés (traduites en anglais) |
| `apps/frontend/messages/ar.json` | Ajouter les mêmes clés (traduites en arabe, RTL) |
| `apps/frontend/messages/tzm.json` | Ajouter les mêmes clés (traduites en tifinagh) |

---

## Règles obligatoires (`.kilocode/rules.md`)

1. **Pas de texte FR en dur** dans les composants — tout via `useTranslations('dashboard')` ou équivalent
2. **Pas de couleurs Tailwind brutes** — utiliser les tokens du design system (`primary-*`, `stone-*`, `cream-*`, `secondary-*`, `cta-*`, `success`, `error`, `warning`, `info`)
3. **Pas de `any`** sans justification documentée
4. **Pas de `console.log`** dans le code final
5. **Support RTL** : tous les styles margin/padding doivent utiliser les propriétés logiques (`ms-*`/`me-*` au lieu de `ml-*`/`mr-*`, `ps-*`/`pe-*` au lieu de `pl-*`/`pr-*`)
6. **Composants serveur par défaut** — ne mettre `'use client'` que quand c'est nécessaire (état, effets, événements, recharts)
7. **`LiveStatsWidget`** doit accepter un prop optionnel `clickable?: boolean` (défaut `false`) pour éviter de casser la page `/dashboard/queue` qui l'utilise sans clic
8. **Ne pas modifier** les fichiers protégés : `design-system/MASTER.md`, `docs/PRD.md`, `AGENTS.md`, `.kilocode/rules.md`, `payload.config.ts`, `next.config.ts`, `middleware.ts`, les migrations

---

## Build gate

Avant de commit, exécuter obligatoirement :
```bash
npx tsc --noEmit && npx next build
```
dans `apps/frontend`. Aucun commit si le build échoue.

---

## Ordre d'implémentation recommandé

1. **Sidebar** (correction + nouvelle entrée) — le plus simple, pas de dépendance
2. **Page `/dashboard/queue`** — extraire les composants existants
3. **Fixes design system** (`LiveStatsWidget` + `WaitingRoomList`)
4. **Refonte `/dashboard`** (search bar, stats cliquables, queue preview)
5. **Widget vaccinal** (fonctions utilitaires d'abord, puis composant)
6. **Page Activité** (fetch serveur + composant client)
7. **i18n** — ajouter les clés, puis les utiliser dans tous les composants
8. **Build gate** → commit
