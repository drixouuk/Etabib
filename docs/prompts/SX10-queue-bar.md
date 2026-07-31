# PROMPT FLASH — Barre de file d'attente dans la sidebar (cabinet, médecin uniquement)

> **Build gate :** `pnpm build` dans `apps/frontend` après implémentation. Design system : `design-system/MASTER.md`. Ne pas casser l'existant. Dashboard français uniquement.

---

## Objectif

Une **carte compacte** dans la sidebar avec **deux gros chiffres + une ligne de progression fine**, uniquement pour tier `cabinet` + rôle `doctor`.

Le chiffre est l'information primaire (lecture en vision périphérique), la ligne est le contexte secondaire (progression dans la journée). Pas de jauges à décoder, pas d'animations excessives — on est dans un contexte médical, pas un jeu mobile.

---

## Design cible

```
┌─ Sidebar ─────────────────────────┐
│                                    │
│  Vue d'ensemble                    │
│  Patients                          │
│  File d'attente                    │
│  ...                               │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  4            14             │ │  ← text-lg font-bold tabular-nums
│  │  en attente   aujourd'hui    │ │  ← text-[9px] text-stone-400
│  │                              │ │
│  │  ━━━━━━━━━━━○━━━━━━━━◆━━━━  │ │  ← h-[3px] rounded-full
│  │             22        38     │ │  ← text-[8px] text-stone-400
│  └──────────────────────────────┘ │
│                                    │
│  👤 Dr X · Médecin                 │
└────────────────────────────────────┘
```

- Carte : `rounded-lg border border-stone-100 bg-white shadow-sm mx-[10px] mt-3 px-3 py-2.5`
- Chiffres : `text-lg font-bold tabular-nums` (chasse fixe, pas de saut de largeur quand le chiffre change)
- Ligne : `h-[3px] rounded-full bg-stone-200`, remplissage `bg-primary-500`
- Marqueur ○ : `size-[5px] rounded-full bg-stone-400` (moyenne)
- Marqueur ◆ : `size-[6px] rounded-[1px] rotate-45 bg-stone-500` (record)
- Labels sous marqueurs : `text-[8px] text-stone-400 absolute -translate-x-1/2`

### Comportement

1. **Changement de chiffre** : brève animation CSS `scale(1.08)` pendant 300ms via une classe `animate-number-pop` (transition CSS, pas de keyframe complexe). La classe est appliquée/retirée via un `useEffect` qui détecte le changement de valeur.

2. **Seuil de tension** : `waiting > dailyAverage * 0.3` → le chiffre "en attente" passe de `text-stone-800` à `text-cta-600`. Changement de couleur calme, pas de pulse.

3. **Nouveau record** : `todayTotal > initialRecord` → le ◆ passe de `bg-stone-500` à `bg-cta-500` + le chiffre "aujourd'hui" prend un `ring-1 ring-cta-200` pendant 3s (via setTimeout). Discret mais visible.

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
  const [justBrokeRecord, setJustBrokeRecord] = useState(false)
  const [popWaiting, setPopWaiting] = useState(false)
  const [popToday, setPopToday] = useState(false)

  // Refs pour éviter le bug de closure stale dans le useEffect([])
  const initialRecordRef = useRef(0)
  const hasLoadedRef = useRef(false)
  const prevWaitingRef = useRef(0)
  const prevTodayRef = useRef(0)
  const recordTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/queue-stats')
        if (!res.ok) return
        const data: QueueStats = await res.json()

        if (!hasLoadedRef.current) {
          initialRecordRef.current = data.dailyRecord
          hasLoadedRef.current = true
        }

        if (initialRecordRef.current > 0 && data.todayTotal > initialRecordRef.current) {
          setJustBrokeRecord(true)
          if (recordTimer.current) clearTimeout(recordTimer.current)
          recordTimer.current = setTimeout(() => setJustBrokeRecord(false), 3000)
        }

        if (data.waiting !== prevWaitingRef.current) setPopWaiting(true)
        if (data.todayTotal !== prevTodayRef.current) setPopToday(true)

        prevWaitingRef.current = data.waiting
        prevTodayRef.current = data.todayTotal
        setStats(data)
      } catch { /* silencieux */ }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Reset pop animation after 300ms
  useEffect(() => { if (popWaiting) { const t = setTimeout(() => setPopWaiting(false), 300); return () => clearTimeout(t) } }, [popWaiting])
  useEffect(() => { if (popToday) { const t = setTimeout(() => setPopToday(false), 300); return () => clearTimeout(t) } }, [popToday])

  if (!stats || stats.dailyRecord === 0) return null

  const todayMax = Math.max(stats.dailyRecord, stats.todayTotal, 1)
  const todayPct = Math.min((stats.todayTotal / todayMax) * 100, 100)
  const avgPct = (stats.dailyAverage / todayMax) * 100
  const recPct = (stats.dailyRecord / todayMax) * 100
  const isTense = stats.waiting > stats.dailyAverage * 0.3

  return (
    <div className="mx-[10px] mt-3 rounded-lg border border-stone-100 bg-white px-3 py-2.5 shadow-sm">
      {/* Chiffres */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className={`inline-block text-lg font-bold tabular-nums transition-all duration-300 ${
            popWaiting ? 'scale-110' : 'scale-100'
          } ${isTense ? 'text-cta-600' : 'text-stone-800'}`}>
            {stats.waiting}
          </span>
          <p className="text-[9px] text-stone-400 leading-none mt-0.5">en attente</p>
        </div>
        <div className="text-end">
          <span className={`inline-block text-lg font-bold tabular-nums transition-all duration-300 ${
            popToday ? 'scale-110' : 'scale-100'
          } ${justBrokeRecord ? 'ring-1 ring-cta-200 rounded' : ''}`}>
            {stats.todayTotal}
          </span>
          <p className="text-[9px] text-stone-400 leading-none mt-0.5">aujourd&apos;hui</p>
        </div>
      </div>

      {/* Ligne de progression */}
      <div className="relative mt-2.5 h-[3px] rounded-full bg-stone-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary-500 transition-all duration-700 ease-out"
          style={{ width: `${todayPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-[5px] rounded-full bg-stone-400"
          style={{ left: `${avgPct}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-[6px] rounded-[1px] rotate-45 transition-colors duration-500 ${
            justBrokeRecord ? 'bg-cta-500' : 'bg-stone-500'
          }`}
          style={{ left: `${recPct}%` }}
        />
      </div>

      {/* Labels sous les marqueurs */}
      <div className="relative h-3 mt-0.5">
        <span
          className="absolute -translate-x-1/2 text-[8px] text-stone-400"
          style={{ left: `${avgPct}%` }}
        >
          {stats.dailyAverage}
        </span>
        <span
          className="absolute -translate-x-1/2 text-[8px] text-stone-400"
          style={{ left: `${recPct}%` }}
        >
          {stats.dailyRecord}
        </span>
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

- Connecté en médecin cabinet → carte visible avec deux chiffres + ligne
- Connecté en secrétaire/vitrine/RDV → rien
- Ajouter des patients à la file → chiffre gauche change avec pop
- Traiter des patients → chiffre droit change, ligne progresse
- Dépasser le record → ◆ change de couleur, chiffre droit prend un ring

### Fichiers créés/modifiés

| Créés | Modifiés |
|---|---|
| `api/queue-stats/route.ts` | `Sidebar.tsx` |
| `components/dashboard/QueueBar.tsx` | — |

### Empreinte verticale

~60px (chiffres + ligne + labels) — vs ~120px pour les deux thermomètres. Dans une sidebar avec 6-8 items de nav + footer utilisateur, l'économie est significative.
