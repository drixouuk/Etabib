# PROMPT FLASH — Barre de file d'attente dans la sidebar (cabinet, médecin uniquement)

> **Build gate :** `pnpm build` dans `apps/frontend` après implémentation. Design system : `design-system/MASTER.md`. Ne pas casser l'existant. Dashboard français uniquement.

---

## Objectif

Deux **thermomètres verticaux** côte à côte dans la sidebar, **uniquement pour tier `cabinet` + rôle `doctor`** :

1. **Gauche — « En attente »** : nombre de patients actuellement en salle d'attente. Simple, sans marqueurs, sans animation record. Le barreau se remplit du bas vers le haut.
2. **Droite — « Aujourd'hui »** : total cumulé de patients vus dans la journée. Le barreau se remplit du bas vers le haut au fil de la journée. Marqueurs moyenne quotidienne (○) et record absolu (◆) positionnés le long du bord droit. Animation quand on dépasse le record.

Format vertical adapté à la sidebar de 252px — les barres horizontales seraient trop fines pour être lisibles.

---

## Design cible

```
┌─ Sidebar (252px) ──────────────────────────┐
│                                             │
│  Vue d'ensemble                             │
│  Patients                                   │
│  ...                                        │
│                                             │
│  En attente          Aujourd'hui            │
│  ┌────┐              ┌────┐ ◆ 38            │
│  │    │              │ ██ │                 │
│  │ ██ │              │ ██ │                 │
│  │ ██ │              │ ██ │ ○ 22            │
│  │ ██ │              │ ██ │                 │
│  │ ██ │              │ ██ │                 │
│  └────┘              └────┘                 │
│    4               14 / moy.22              │
│                                             │
│  👤 Dr X · Médecin                          │
└─────────────────────────────────────────────┘
```

- Deux colonnes en `flex gap-4`, chaque colonne ~100px de large
- Barre verticale de ~80px de haut, 16px de large, `rounded-full`
- Fond `bg-stone-200`, remplissage du bas vers le haut (élément interne positionné en `bottom: 0` avec la hauteur proportionnelle)
- Labels en dessous de chaque barre

### Thermomètre « En attente »
- Remplissage : `bg-primary-500` (solide, pas de gradient)
- Hauteur : `(waiting / waitingMax) * 100%`, avec `waitingMax = Math.max(10, Math.round(dailyRecord * 0.3))`
- Pas de marqueurs, pas d'animation record
- Simple et lisible

### Thermomètre « Aujourd'hui »
- Remplissage : `bg-gradient-to-t from-primary-600 to-cta-500`
- Hauteur : `(todayTotal / todayMax) * 100%`, avec `todayMax = Math.max(dailyRecord, todayTotal, 1)`
- Marqueur ○ : ligne horizontale pointillée à `(dailyAverage / todayMax) * 100%` de hauteur, en `secondary-400`
- Marqueur ◆ : ligne horizontale pointillée à `(dailyRecord / todayMax) * 100%` de hauteur, en `secondary-500`
- Animation record : quand `todayTotal > initialRecord` → le ◆ pulse 3 fois + remplissage passe en `bg-cta-500` pendant 2s

### Comportement des marqueurs (thermomètre « Aujourd'hui »)
- Les marqueurs sont des lignes horizontales absolues **en overlay** sur la barre verticale
- Ils sont rendus dans un conteneur parent `relative`, en `absolute` avec `left: 0; right: 0`
- `○` = `border-t border-dashed secondary-400` (ligne pointillée fine)
- `◆` = `border-t border-dashed secondary-500` + petit losange à droite
- Pas d'`overflow-hidden` sur le thermomètre — les lignes dépassent sur la droite pour porter le label chiffré

---

## Implémentation

### 1. Endpoint serveur `GET /api/queue-stats`

**Fichier :** `apps/frontend/src/app/api/queue-stats/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const meRes = await fetch(`${CMS_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
  const me = await meRes.json()
  const tenantId = typeof me?.user?.tenant === 'object' ? me.user.tenant.id : me?.user?.tenant
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 })

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const waitingRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[status][equals]=waiting&depth=0&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const waitingData = await waitingRes.json()
  const waiting = waitingData?.docs?.length ?? 0

  const todayRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[createdAt][greater_than]=${today.toISOString()}&depth=0&limit=500`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const todayData = await todayRes.json()
  const todayTotal = todayData?.docs?.length ?? 0

  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const historyRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[createdAt][greater_than]=${thirtyDaysAgo.toISOString()}&where[createdAt][less_than]=${today.toISOString()}&depth=0&limit=2000`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const historyData = await historyRes.json()
  const historyItems = historyData?.docs ?? []

  const dailyTotals: Record<string, number> = {}
  historyItems.forEach((i: any) => {
    const day = new Date(i.createdAt).toISOString().slice(0, 10)
    dailyTotals[day] = (dailyTotals[day] || 0) + 1
  })
  const totals = Object.values(dailyTotals)
  const dailyAverage = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0
  const dailyRecord = totals.length > 0 ? Math.max(...totals) : 0

  return NextResponse.json({ waiting, todayTotal, dailyAverage, dailyRecord })
}
```

### 2. Composant `QueueBar.tsx`

**Fichier :** `apps/frontend/src/components/dashboard/QueueBar.tsx`

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'

type QueueStats = {
  waiting: number
  todayTotal: number
  dailyAverage: number
  dailyRecord: number
}

export default function QueueBar() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [initialRecord, setInitialRecord] = useState(0)
  const [justBrokeRecord, setJustBrokeRecord] = useState(false)
  const recordTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/queue-stats')
        if (!res.ok) return
        const data: QueueStats = await res.json()
        if (!stats) setInitialRecord(data.dailyRecord)
        if (initialRecord > 0 && data.todayTotal > initialRecord) {
          setJustBrokeRecord(true)
          if (recordTimer.current) clearTimeout(recordTimer.current)
          recordTimer.current = setTimeout(() => setJustBrokeRecord(false), 3000)
        }
        setStats(data)
      } catch { /* silencieux */ }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  const waitingMax = Math.max(10, Math.round((stats.dailyRecord || 10) * 0.3))
  const waitingPct = Math.min((stats.waiting / waitingMax) * 100, 100)

  const todayMax = Math.max(stats.dailyRecord, stats.todayTotal, 1)
  const todayPct = Math.min((stats.todayTotal / todayMax) * 100, 100)
  const avgPct = (stats.dailyAverage / todayMax) * 100
  const recPct = (stats.dailyRecord / todayMax) * 100

  const barH = 80 // hauteur du thermomètre en px

  return (
    <div className="px-[10px] pt-3">
      <div className="flex gap-4">
        {/* Thermomètre gauche : En attente */}
        <div className="flex-1 flex flex-col items-center">
          <p className="text-[9px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">En attente</p>
          <div className="relative rounded-full bg-stone-200" style={{ width: 16, height: barH }}>
            <div
              className="absolute inset-x-0 bottom-0 rounded-full bg-primary-500 transition-all duration-700 ease-out"
              style={{ height: `${waitingPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] font-semibold text-stone-700">{stats.waiting}</p>
        </div>

        {/* Thermomètre droit : Aujourd'hui */}
        <div className="flex-1 flex flex-col items-center">
          <p className="text-[9px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Aujourd'hui</p>
          <div className="relative rounded-full bg-stone-200" style={{ width: 16, height: barH }}>
            {/* Marqueur record (ligne pointillée + losange) */}
            {stats.dailyRecord > 0 && (
              <div className="absolute inset-x-0" style={{ bottom: `${recPct}%` }}>
                <div className={`absolute -right-3 top-0 -translate-y-1/2 size-2 rounded-sm rotate-45 transition-all duration-500 ${
                  justBrokeRecord ? 'bg-cta-500 scale-150' : 'bg-secondary-500'
                }`} />
                <span className="absolute -right-7 top-0 -translate-y-1/2 text-[8px] text-secondary-600 font-bold">{stats.dailyRecord}</span>
              </div>
            )}
            {/* Marqueur moyenne (ligne pointillée) */}
            {stats.dailyAverage > 0 && (
              <div className="absolute inset-x-0 border-t border-dashed border-secondary-400" style={{ bottom: `${avgPct}%` }}>
                <span className="absolute -right-7 top-0 -translate-y-1/2 text-[8px] text-stone-400">{stats.dailyAverage}</span>
              </div>
            )}
            {/* Remplissage */}
            <div
              className={`absolute inset-x-0 bottom-0 rounded-full transition-all duration-700 ease-out ${
                justBrokeRecord ? 'bg-cta-500' : 'bg-gradient-to-t from-primary-600 to-cta-500'
              }`}
              style={{ height: `${todayPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] font-semibold text-stone-700">{stats.todayTotal}</p>
        </div>
      </div>
    </div>
  )
}
```

### 3. Intégration dans `Sidebar.tsx`

```tsx
import QueueBar from './QueueBar'

// Entre SidebarNav et le footer :
<SidebarNav items={navItems} adminItems={adminItems} onNavigate={onNavigate} />

{tier === 'cabinet' && user.roles?.includes('doctor') && (
  <QueueBar />
)}

<div className="border-t border-primary-600/15 px-[10px] pt-4 mt-auto">
```

---

## Vérification

```bash
cd apps/frontend && pnpm build
```

- Connecté en médecin cabinet → deux thermomètres visibles
- Connecté en secrétaire/vitrine/RDV → aucun thermomètre
- Ajouter des patients à la file → thermomètre gauche se remplit
- Traiter des patients → thermomètre droit progresse
- Dépasser le record → ◆ pulse + barre passe en orange

### Fichiers créés/modifiés

| Créés | Modifiés |
|---|---|
| `api/queue-stats/route.ts` | `Sidebar.tsx` |
| `components/dashboard/QueueBar.tsx` | — |
