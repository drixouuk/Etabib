# PROMPT FLASH — Barre de file d'attente dans la sidebar (cabinet, médecin uniquement)

> **Build gate :** `pnpm build` dans `apps/frontend` après implémentation. Design system : `design-system/MASTER.md`. Ne pas casser l'existant. Dashboard français uniquement.

---

## Objectif

Ajouter dans la sidebar (espace praticien) une barre colorée animée qui représente visuellement la file d'attente du jour. **Uniquement pour le tier `cabinet` + rôle `doctor`** — invisible pour secrétaire, remplaçant, vitrine, RDV.

La barre est minimaliste, sans texte ou presque, animée, vivante. Elle donne au médecin une idée immédiate de sa charge de travail sans avoir à ouvrir la page File d'attente.

---

## Design cible

```
┌─ Sidebar ───────────────────────────┐
│                                      │
│  Vue d'ensemble                      │
│  Patients                            │
│  File d'attente                      │
│  Activité                            │
│  Rendez-vous                         │
│  Paramètres                          │
│                                      │
│  ┌─ Barre de file ────────────────┐ │
│  │ ●━━━━━━━━━━○━━━━━━━━━━━━◆━━━━ │ │  ← barre colorée avec marqueurs
│  │                                  │ │
│  └─────────────────────────────────┘ │
│                                      │
│  👤 Dr X · Médecin                   │
│  [Déconnexion]                       │
└──────────────────────────────────────┘
```

### Légende des marqueurs
- `●` début de barre (0)
- `━━` barre remplie proportionnellement au nombre de patients en attente
- `○` marqueur de la **moyenne quotidienne** (petit diamant/point)
- `◆` marqueur du **record absolu** (diamant plus gros)
- Fond de barre : stone-200, remplissage : gradient `primary-500 → primary-600`

### Animations
1. **Quand la file dépasse la moyenne** : le ○ pulse doucement (scale 1→1.2→1, loop 1.5s, couleur passe à amber-500)
2. **Quand un nouveau record est atteint** (file actuelle ≥ record précédent) : le ◆ explose en confettis ou clignote 3 fois, la barre entière passe en `primary-700 → cta-500` pendant 2 secondes puis revient
3. **Transition normale** : la barre se remplit/déremplit avec `transition-all duration-700 ease-out`

---

## Implémentation

### 1. Nouveau composant `QueueBar.tsx`

**Fichier :** `apps/frontend/src/components/dashboard/QueueBar.tsx`

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'

type QueueStats = {
  waiting: number          // patients actuellement en salle d'attente (status: 'waiting')
  todayTotal: number       // total patients du jour (tous statuts)
  dailyAverage: number     // moyenne des 30 derniers jours
  dailyRecord: number      // record absolu (max en un jour)
}

export default function QueueBar() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [prevRecord, setPrevRecord] = useState(0)
  const [justBrokeRecord, setJustBrokeRecord] = useState(false)
  const recordTimer = useRef<ReturnType<typeof setTimeout>>()

  // Fetch toutes les 30 secondes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Récupérer les queue-items du jour
        const res = await fetch('/api/cms-proxy/queue-items?depth=0&limit=200')
        const data = await res.json()
        const items = data?.docs ?? []

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayItems = items.filter((i: any) =>
          i.arrivalTime && new Date(i.arrivalTime) >= today
        )

        const waiting = todayItems.filter((i: any) => i.status === 'waiting').length
        const todayTotal = todayItems.length

        // Calculer la moyenne et le record depuis l'historique (derniers 30 jours)
        // Utiliser /api/cms-proxy/queue-items?where[createdAt][greater_than]=...
        // ou calculer côté client avec les données disponibles
        const statsRes = await fetch(
          `/api/cms-proxy/queue-items?where[createdAt][greater_than]=${new Date(Date.now() - 30 * 86400000).toISOString()}&depth=0&limit=1000`
        )
        const statsData = await statsRes.json()
        const allItems = statsData?.docs ?? []

        // Grouper par jour et calculer les totaux
        const dailyTotals: Record<string, number> = {}
        allItems.forEach((i: any) => {
          const day = new Date(i.arrivalTime || i.createdAt).toISOString().slice(0, 10)
          dailyTotals[day] = (dailyTotals[day] || 0) + 1
        })

        const totals = Object.values(dailyTotals)
        const dailyAverage = totals.length > 0
          ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
          : 0
        const dailyRecord = totals.length > 0 ? Math.max(...totals) : 0

        setStats({ waiting, todayTotal, dailyAverage, dailyRecord })
      } catch {
        // silencieux
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Détecter nouveau record
  useEffect(() => {
    if (!stats) return
    if (stats.todayTotal > prevRecord && prevRecord > 0) {
      setJustBrokeRecord(true)
      if (recordTimer.current) clearTimeout(recordTimer.current)
      recordTimer.current = setTimeout(() => setJustBrokeRecord(false), 3000)
    }
    setPrevRecord(stats.todayTotal)
  }, [stats?.todayTotal])

  if (!stats || stats.dailyRecord === 0) return null

  const maxBar = Math.max(stats.dailyRecord, stats.todayTotal, 1)
  const fillPct = Math.min((stats.waiting / maxBar) * 100, 100)
  const avgPosition = (stats.dailyAverage / maxBar) * 100
  const recordPosition = (stats.dailyRecord / maxBar) * 100

  const isAboveAverage = stats.waiting > stats.dailyAverage

  return (
    <div className="px-[10px] pt-3">
      <div className="relative h-2 rounded-full bg-stone-200 overflow-hidden">
        {/* Barre remplie */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
            justBrokeRecord
              ? 'bg-gradient-to-r from-primary-700 to-cta-500'
              : 'bg-gradient-to-r from-primary-500 to-primary-600'
          }`}
          style={{ width: `${fillPct}%` }}
        />

        {/* Marqueur moyenne */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full border-2 border-white transition-all duration-500 ${
            isAboveAverage ? 'bg-amber-500 animate-pulse scale-125' : 'bg-stone-400'
          }`}
          style={{ left: `${avgPosition}%` }}
        />

        {/* Marqueur record */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2.5 rounded-sm rotate-45 border border-white transition-all duration-500 ${
            justBrokeRecord ? 'bg-cta-500 scale-150' : 'bg-stone-500'
          }`}
          style={{ left: `${recordPosition}%` }}
        />
      </div>

      {/* Mini-indicateurs sous la barre */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-stone-500 font-medium">
          {stats.waiting} en attente
        </span>
        <span className="text-[10px] text-stone-400">
          moy. {stats.dailyAverage}
        </span>
        <span className="text-[10px] text-stone-400">
          max. {stats.dailyRecord}
        </span>
      </div>
    </div>
  )
}
```

### 2. Intégration dans `Sidebar.tsx`

**Fichier :** `apps/frontend/src/components/dashboard/Sidebar.tsx`

Ajouter l'import :
```tsx
import QueueBar from './QueueBar'
```

Ajouter le composant entre `<SidebarNav>` et le bloc utilisateur (footer) :

```tsx
<SidebarNav items={navItems} adminItems={adminItems} onNavigate={onNavigate} />

{tier === 'cabinet' && user.roles?.includes('doctor') && (
  <QueueBar />
)}

<div className="border-t border-primary-600/15 px-[10px] pt-4 mt-auto">
```

### 3. Vérifier les performances

Le fetch `/api/cms-proxy/queue-items` est appelé toutes les 30 secondes. Sur les 30 derniers jours, `limit=1000` devrait couvrir l'usage normal d'un cabinet (~30 patients/jour max). Si le cabinet a plus de volume, augmenter la limite.

Alternative plus propre si le volume est élevé : créer un endpoint dédié `GET /api/queue-stats` qui fait l'agrégation côté serveur (SQL) et ne renvoie que `{ waiting, dailyAverage, dailyRecord }`. Mais pour un cabinet moyen, l'approche client-side est suffisante.

---

## Vérification

```bash
cd apps/frontend && pnpm build
```

Vérifier visuellement :
- Connecté en tant que médecin cabinet → la barre apparaît dans la sidebar
- Connecté en tant que secrétaire ou compte vitrine/RDV → la barre n'apparaît pas
- Ajouter/supprimer des patients de la file → la barre se met à jour
- Dépasser la moyenne → le marqueur ○ pulse en ambre
- Atteindre un record → la barre change de couleur + le ◆ grossit

### Fichiers créés/modifiés

| Créé | Modifié |
|---|---|
| `components/dashboard/QueueBar.tsx` | `components/dashboard/Sidebar.tsx` |
