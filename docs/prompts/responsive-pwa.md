# Issue : Responsive mobile + PWA

## Contexte

- Le site a été conçu desktop-first. Le responsive n'a jamais été traité.
- Le dashboard est inutilisable sur mobile : la sidebar fixe (`w-[208px]`) occupe 55% d'un écran 375px.
- Le header public a des liens de navigation visibles sur desktop mais pas de menu hamburger sur mobile.
- Les tableaux, grilles et formulaires ne s'adaptent pas aux petits écrans.
- Aucun fichier PWA n'existe (manifest, service worker, icônes).
- C'est le dernier lot de code avant la migration OVH. Tout doit être responsive d'un coup, pas de retouche incrémentale.
- L'espace praticien est FR-only (pas d'i18n pour les nouveaux labels).

---

## Architecture responsive dashboard

### Problème

```
┌──────────────────┬──────────────────────────────────────┐
│ Sidebar 208px    │  Contenu                              │
│                  │                                       │
│ (fixe)           │  (flex-1)                             │
└──────────────────┴──────────────────────────────────────┘
```

Sur mobile (< 768px) : la sidebar de 208px laisse seulement 167px pour le contenu. Solution : hamburger menu.

### Approche retenue

```
Desktop (>= 768px) :
┌──────────────────┬──────────────────────────────────────┐
│ Sidebar 208px    │  Contenu                              │
└──────────────────┴──────────────────────────────────────┘

Mobile (< 768px) :
┌──────────────────────────────────────────────────────────┐
│ ☰ Cabinet Dr X                          [top bar fixe]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Contenu (pleine largeur)                                │
│                                                          │
└──────────────────────────────────────────────────────────┘

  [si ☰ cliqué → side sheet glisse depuis la gauche + overlay]
```

---

## Travail à faire

### 1. Refacto Sidebar — extraire le contenu pur

**Fichier à modifier** : `apps/frontend/src/components/dashboard/Sidebar.tsx`

Actuellement le composant fait 2 choses : fetch les données (`getTenantById`) + rendu.  
Le déplacer entièrement en **composant présentatif** (ni `async`, ni `'use client'`) qui reçoit `user` et `tenant` en props.

```tsx
type Props = {
  user: PayloadUser
  tenant?: Tenant | null  // ← déjà fetché par le layout, plus besoin de getTenantById ici
  onNavigate?: () => void // ← callback pour fermer le drawer sur mobile
}
```

Changements :
- Supprimer l'appel à `getTenantById()` (lignes 27-28)
- Supprimer le `async`
- Le paramètre `tenant` vient du parent
- Ajouter un prop optionnel `onNavigate?: () => void` appelé au clic sur chaque lien (permet de fermer le drawer mobile)
- Le `<aside>` parent est retiré — ce composant rend UNIQUEMENT le contenu de la sidebar (sans le wrapper `<aside>`). Le wrapper sera dans `DashboardShell`.
- Le form logout en bas reste

### 2. Créer DashboardShell (wrapper responsive)

**Fichier à créer** : `apps/frontend/src/components/dashboard/DashboardShell.tsx`

Composant client (`'use client'`) :

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import type { PayloadUser } from '@/lib/auth'
import type { Tenant } from '@/lib/payload'

type Props = {
  user: PayloadUser
  tenant: Tenant | null
  children: React.ReactNode
}

export default function DashboardShell({ user, tenant, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fermer la sidebar sur resize desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Empêcher le scroll du body quand la sidebar mobile est ouverte
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar (visible >= md) */}
      <aside className="hidden md:flex w-[208px] shrink-0 flex-col border-r border-cream-200 bg-cream-100">
        <Sidebar user={user} tenant={tenant} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Side sheet */}
          <aside
            className={`absolute inset-y-0 flex w-64 flex-col border-r border-cream-200 bg-cream-100 shadow-xl transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Bouton fermer */}
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-cream-200 hover:text-stone-700"
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <Sidebar user={user} tenant={tenant} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="truncate font-heading text-sm font-semibold text-stone-800">
            {tenant?.name || 'Cabinet'}
          </span>
        </div>
        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 3. Mise à jour du layout dashboard

**Fichier à modifier** : `apps/frontend/src/app/[locale]/(dashboard)/layout.tsx`

Remplacer le rendu actuel :

```tsx
import { requireAuth } from '@/lib/auth'
import { getTenantById } from '@/lib/payload'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayout({ children }: Props) {
  const user = await requireAuth()

  const tenantId = typeof user.tenant === 'object' ? (user.tenant as any).id : user.tenant
  if (tenantId) {
    const tenant = await getTenantById(tenantId)
    const tier = tenant?.settings?.activeTier
    if (!tier || (tier !== 'dossier' && tier !== 'clinique')) {
      redirect('/')
    }
    return (
      <DashboardShell user={user} tenant={tenant}>
        {children}
      </DashboardShell>
    )
  }

  return (
    <DashboardShell user={user} tenant={null}>
      {children}
    </DashboardShell>
  )
}
```

### 4. Header mobile — menu hamburger

**Fichier à modifier** : `apps/frontend/src/components/layout/Header.tsx`

Ajouter un menu hamburger mobile. Actuellement, les liens de navigation sont dans `hidden md:flex`. Sur mobile, il faut un bouton hamburger qui ouvre un menu déroulant.

Modifications :
- Ajouter un état `mobileMenuOpen` (useState)
- Ajouter un bouton hamburger (icône `Menu`) visible sur mobile uniquement (`md:hidden`)
- Ajouter un menu déroulant sous la navbar quand `mobileMenuOpen` est true
- Le menu contient les mêmes liens que la version desktop
- Fermeture automatique au clic sur un lien
- Animation : `transition-all duration-200`

Structure du menu mobile :
```tsx
{/* Bouton hamburger (mobile) */}
<button
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  className="rounded-lg p-2 text-stone-600 hover:bg-cream-200 md:hidden"
  aria-label="Menu"
>
  {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
</button>

{/* Menu déroulant mobile */}
{mobileMenuOpen && (
  <div className="absolute left-4 right-4 top-full mt-2 rounded-xl border border-stone-200 bg-white p-2 shadow-lg md:hidden">
    {navLinks.map(({ href, key }) => (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileMenuOpen(false)}
        className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-cream-100 hover:text-primary-700"
      >
        {t(key)}
      </Link>
    ))}
    <hr className="my-1 border-stone-100" />
    <button
      onClick={() => { window.dispatchEvent(new CustomEvent("open-rdv")); setMobileMenuOpen(false) }}
      className="w-full rounded-lg bg-cta-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cta-800"
    >
      {t('cta')}
    </button>
  </div>
)}
```

Modifier le conteneur `<header>` pour supporter le menu déroulant :
- Ajouter `relative` sur le `<header>`

### 5. Pages dashboard — correctifs responsive page par page

#### 5a. Vue d'ensemble (`/dashboard/page.tsx`)

- La grille `grid-cols-1 gap-6 lg:grid-cols-2` (QueuePreview + VaccinationAlerts) — déjà OK sur mobile (1 colonne)
- Stats cliquables : `grid-cols-2 lg:grid-cols-4` — OK
- Barre de recherche patient : déjà responsive (w-full)
- Quick links : sur mobile, les boutons doivent être empilés ou en `flex-wrap`

**Modification** : ajouter `flex-wrap` au `<nav>` des quick links et retirer le lien "Patients" (déjà dans la sidebar).

#### 5b. Patients liste (`/dashboard/patients/page.tsx`)

- Le tableau à 5 colonnes déborde sur mobile.
- Solution : wrapper avec `overflow-x-auto` + `min-w-full` sur le conteneur du tableau
- La barre de recherche + boutons sur mobile : les boutons passent en dessous sur petits écrans

**Modifications** :
```tsx
{/* Container avec scroll horizontal */}
<div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
  <table className="min-w-[640px] w-full text-left text-sm">
    ...
  </table>
</div>
```

- Formulaire recherche : `flex-col sm:flex-row gap-2` au lieu de `flex gap-2`

#### 5c. Fiche patient (`/dashboard/patients/[id]/page.tsx`)

Problèmes :
- Grille info patient : `grid grid-cols-2 md:grid-cols-4` → OK avec `grid-cols-2`
- Consultation + Prescription : `grid grid-cols-1 lg:grid-cols-2` → OK (déjà responsive)
- GrowthChart 3 colonnes : `grid grid-cols-1 md:grid-cols-3` → déjà OK
- VaccinationRecord : la table doit défiler horizontalement

**Vérification** : lire le fichier complet pour identifier toutes les classes grille. Ajouter `overflow-x-auto` sur VaccinationRecord si pas présent.

#### 5d. File d'attente (`/dashboard/queue/page.tsx`)

- Stats : `grid-cols-2 lg:grid-cols-4` — OK sur mobile
- WaitingRoomList : les cartes sont déjà en liste verticale — OK
- Action buttons : `hidden sm:inline-block` pour les badges statut (déjà fait)

#### 5e. Activité (`/dashboard/activity/page.tsx`)

- Period selector : `inline-flex` fonctionne sur mobile (4 boutons côte à côte). Si trop large sur très petit écran, ajouter `flex-wrap`
- Compteurs : `grid-cols-2` — OK sur mobile
- Graphique : `ResponsiveContainer` s'adapte automatiquement — OK

#### 5f. Rendez-vous (`/dashboard/rendez-vous/page.tsx`)

- Booking cards : déjà en liste verticale — OK
- Segmented control : `inline-flex` — OK

#### 5g. Audit logs (`/dashboard/audit-logs/page.tsx`)

- Tableau : ajouter `overflow-x-auto` + `min-w-[640px]`

#### 5h. System alerts (`/dashboard/system-alerts/page.tsx`)

- Cartes déjà empilées verticalement — OK

#### 5i. Nouveau patient / Édition patient

- Formulaire : `max-w-lg` — OK sur mobile. Vérifier que les champs ne débordent pas.

### 6. Pages publiques — correctifs

#### 6a. LayoutShell — ajustement padding mobile

- `pt-20` sur desktop pour la navbar fixe = 80px. Sur mobile, la navbar fait ~56px. Réduire à `pt-16` sur mobile.

```tsx
<div className={isDashboard ? 'flex flex-1 flex-col' : 'flex flex-1 flex-col pt-16 md:pt-20'}>
```

#### 6b. Pages principales (homepage, etc.)

- Vérifier que toutes les sections utilisent `px-4 md:px-6 lg:px-8`
- Vérifier que les grilles stack sur mobile (la plupart utilisent déjà des classes responsives)
- Pas de modification structurelle — le site public semble déjà assez responsive. Vérifier ponctuellement.

### 7. PWA — manifest

**Fichier à créer** : `apps/frontend/src/app/manifest.ts`

Next.js App Router manifest via l'API `generateMetadata`/manifest :

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dr Tabibi — Cabinet médical',
    short_name: 'Dr Tabibi',
    description: 'Plateforme de gestion de cabinet médical',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFBF0',
    theme_color: '#0D9488',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

> **Note** : les icônes `public/icons/icon-*.png` devront être générées. Pour le moment, créer le manifest avec les chemins corrects. Driss fournira les icônes.
> Alternative : utiliser un placeholder SVG inline qu'on exporte en PNG. On peut aussi utiliser un favicon simple pour le MVP et améliorer plus tard.

Pour générer des icônes placeholder rapidement : créer un script simple ou utiliser des icônes carrées de couleur avec une lettre.

### 8. PWA — Service Worker

**Fichier à créer** : `apps/frontend/public/sw.js`

Service worker basique avec stratégie cache-first pour les assets statiques :

```js
const CACHE_NAME = 'dr-tabibi-v1'

const STATIC_ASSETS = [
  '/',
  '/fr',
  '/fr/login',
  '/fr/onboarding',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les appels API / CMS
  if (event.request.url.includes('/api/') || event.request.url.includes('/dashboard/')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Cache-first : retourne le cache, puis met à jour en arrière-plan
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })

      return cached || fetchPromise
    })
  )
})
```

### 9. PWA — Enregistrement du Service Worker

**Fichier à modifier** : `apps/frontend/src/app/[locale]/layout.tsx`

Ajouter le script d'enregistrement du service worker dans le `<head>` ou en bas du `<body>` :

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(() => {})
        })
      }
    `,
  }}
/>
```

À placer avant la fermeture `</body>`.

### 10. PWA — Viewport et meta tags

**Fichier à modifier** : `apps/frontend/src/app/[locale]/layout.tsx`

Ajouter des meta tags PWA dans `<head>` pour iOS et Android :

```tsx
<meta name="theme-color" content="#0D9488" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Dr Tabibi" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### 11. PWA — Icônes placeholder

**Fichiers à créer** : `apps/frontend/public/icons/icon-192.png`, `apps/frontend/public/icons/icon-512.png`

Pour le MVP, créer des icônes simples (carré teal avec un "T" blanc, ou utiliser le favicon existant). Utiliser un outil comme `sharp` en script post-build ou les générer manuellement.

Alternative rapide : générer un SVG inline et le référencer comme icône. Le manifest accepte le format SVG pour les icônes. Mais le support iOS est limité. Mieux vaut des PNG.

**Solution pragmatique** : copier un favicon existant ou générer via https://realfavicongenerator.net (action manuelle Driss). Dans le prompt, créer le manifest avec les chemins, et ajouter une note pour Driss.

### 12. Vue d'ensemble — responsive fine-tuning

**Fichier à modifier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/page.tsx`

```tsx
{/* Quick links : flex-wrap + padding réduit sur mobile */}
<nav className="flex flex-wrap gap-2">
  ... // les liens existent déjà
</nav>

{/* Titre responsive */}
<h1 className="font-heading text-2xl md:text-3xl font-bold text-stone-800">Vue d&apos;ensemble</h1>
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/components/dashboard/DashboardShell.tsx` | Wrapper responsive sidebar mobile/desktop |
| `apps/frontend/src/app/manifest.ts` | PWA manifest (généré automatiquement par Next.js) |
| `apps/frontend/public/sw.js` | Service worker basic (cache-first) |
| `apps/frontend/public/icons/icon-192.png` | Icône PWA 192×192 |
| `apps/frontend/public/icons/icon-512.png` | Icône PWA 512×512 |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/components/dashboard/Sidebar.tsx` | Refacto : enlever async, recevoir tenant en prop, ajouter onNavigate, retirer wrapper `<aside>` |
| `apps/frontend/src/app/[locale]/(dashboard)/layout.tsx` | Remplacer `<Sidebar>` + `<main>` par `<DashboardShell>` |
| `apps/frontend/src/components/layout/Header.tsx` | Ajouter menu hamburger mobile |
| `apps/frontend/src/components/layout/LayoutShell.tsx` | `pt-16 md:pt-20` au lieu de `pt-20` |
| `apps/frontend/src/app/[locale]/layout.tsx` | Ajouter meta tags PWA + script SW + `<meta name="viewport">` si pas présent |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/page.tsx` | Titre responsive + quick links flex-wrap |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/page.tsx` | `overflow-x-auto` sur tableau + formulaire responsive |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | `overflow-x-auto` sur VaccinationRecord si table |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/audit-logs/page.tsx` | `overflow-x-auto` sur tableau |

---

## Règles obligatoires

1. **Pas de breakpoint custom** — utiliser les breakpoints Tailwind standards (`sm: 640px`, `md: 768px`, `lg: 1024px`).
2. **Design system** : tokens sémantiques uniquement. Pas de couleurs Tailwind brutes.
3. **`'use client'`** uniquement sur `DashboardShell.tsx` (gère l'état sidebar). Tout le reste reste serveur.
4. **Le service worker NE doit PAS casser le dashboard** — exclure `/dashboard/*` et `/api/*` du cache.
5. **Accessibilité** : le bouton hamburger doit avoir un `aria-label`, le drawer mobile doit piéger le focus (ou au minimum avoir un bouton fermer visible).
6. **Performance** : le service worker est léger, pas de `workbox` ni de dépendance lourde.
7. **Icônes** : si impossible de générer les PNG, créer le manifest avec des chemins valides et laisser un commentaire pour Driss. Les icônes manquantes ne bloquent pas l'installation PWA (juste l'icône par défaut).

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

Aucun commit si le build échoue.

---

## Ordre d'implémentation

1. `Sidebar.tsx` — refacto (enlever async, accepter props)
2. `DashboardShell.tsx` — wrapper responsive
3. `(dashboard)/layout.tsx` — intégrer DashboardShell
4. `Header.tsx` — menu hamburger mobile
5. `LayoutShell.tsx` — ajustement padding
6. Pages dashboard — correctifs tableaux/grilles
7. PWA — `manifest.ts`
8. PWA — `public/sw.js`
9. PWA — `public/icons/*.png` + meta tags
10. PWA — enregistrement SW dans `layout.tsx`
11. Build gate
