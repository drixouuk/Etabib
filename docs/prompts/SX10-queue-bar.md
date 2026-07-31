# PROMPT FLASH — Barre de file d'attente dans la sidebar (cabinet, médecin uniquement)

> **Build gate :** `pnpm build` dans `apps/frontend` après implémentation. Design system : `design-system/MASTER.md`. Ne pas casser l'existant. Dashboard français uniquement.

---

## Objectif

Deux barres verticales dans la sidebar, **uniquement pour tier `cabinet` + rôle `doctor`** :

1. **Barre du haut — « En attente »** : nombre de patients actuellement en salle d'attente. Simple, sans marqueurs, sans animation record. Barre proportionnelle à une capacité max raisonnable.
2. **Barre du bas — « Aujourd'hui »** : total cumulé de patients vus dans la journée. Se remplit au fil de la journée. Marqueurs moyenne quotidienne (○) et record absolu (◆). Animation quand on dépasse le record.

Les deux barres sont fines, côte à côte verticalement, sans texte superflu.

---

## Design cible

```
┌─ Sidebar ─────────────────────────────────┐
│                                            │
│  Vue d'ensemble                            │
│  Patients                                  │
│  ...                                       │
│                                            │
│  ┌─ En attente ─────────────────────────┐ │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │  ← primary-500, proportionnel à max 15
│  │  4 en attente                         │ │
│  └───────────────────────────────────────┘ │
│                                            │
│  ┌─ Aujourd'hui ────────────────────────┐ │
│  │ ██████████████░░░░░░░░░░○░░░░░░░░◆ │ │  ← gradient primary→cta, marqueurs moyenne/record
│  │  14 / moy. 22  ·  record 38          │ │
│  └───────────────────────────────────────┘ │
│                                            │
│  👤 Dr X · Médecin                         │
└────────────────────────────────────────────┘
```

### Barre « En attente »
- Remplissage : `primary-500` (solide, pas de gradient)
- Max de la barre : `Math.max(10, dailyRecord * 0.3)` — au moins 10, ou 30% du record pour avoir une échelle qui respire
- Pas de marqueurs, pas d'animation record
- Simple et lisible

### Barre « Aujourd'hui »
- Remplissage : `gradient from-primary-600 to-cta-500`
- Max de la barre : `dailyRecord` (ou `Math.max(dailyRecord, todayTotal)` si aujourd'hui bat le record)
- Marqueur ○ : moyenne quotidienne (`dailyAverage`), en `secondary-400`
- Marqueur ◆ : record absolu (`dailyRecord`), en `secondary-500`
- Animation record : quand `todayTotal > dailyRecord` → le ◆ pulse 3 fois + la barre entière passe en `cta-500` pendant 2s

### Comportement des marqueurs
- Les marqueurs ○ et ◆ sont positionnés à `(valeur / maxBarre) * 100%` le long de la barre
- Ils sont rendus **au-dessus** de la barre (z-index), pas clippés par `overflow-hidden`
- Le conteneur de barre n'a PAS `overflow-hidden` ; seul le div de remplissage intérieur l'a

---

## Implémentation

### 1. Endpoint serveur `GET /api/queue-stats`

**Fichier :** `apps/frontend/src/app/api/queue-stats/route.ts`

```ts
export async function GET(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const meRes = await fetch(`${CMS_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
  const me = await meRes.json()
  const tenantId = typeof me?.user?.tenant === 'object' ? me.user.tenant.id : me?.user?.tenant
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 })

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // Patients en attente maintenant
  const waitingRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[status][equals]=waiting&depth=0&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const waitingData = await waitingRes.json()
  const waiting = waitingData?.docs?.length ?? 0

  // Total du jour
  const todayRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[createdAt][greater_than]=${today.toISOString()}&depth=0&limit=500`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const todayData = await todayRes.json()
  const todayTotal = todayData?.docs?.length ?? 0

  // Moyenne et record (30 derniers jours, hors aujourd'hui)
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

Agrégation côté serveur, pas de transfert de 1000+ docs au client toutes les 30s. Renvoie exactement 4 nombres.

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

        // Détection de record : comparer au record historique (hors aujourd'hui)
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

  // Barre 1 — En attente
  const waitingMax = Math.max(10, Math.round((stats.dailyRecord || 10) * 0.3))
  const waitingPct = Math.min((stats.waiting / waitingMax) * 100, 100)

  // Barre 2 — Aujourd'hui
  const todayMax = Math.max(stats.dailyRecord, stats.todayTotal, 1)
  const todayPct = Math.min((stats.todayTotal / todayMax) * 100, 100)
  const avgPos = (stats.dailyAverage / todayMax) * 100
  const recPos = (stats.dailyRecord / todayMax) * 100

  return (
    <div className="px-[10px] pt-3 space-y-4">
      {/* Barre 1 : En attente */}
      <div>
        <div className="relative h-2 rounded-full bg-stone-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full overflow-hidden transition-all duration-700 ease-out"
            style={{ width: `${waitingPct}%` }}
          >
            <div className="h-full w-full bg-primary-500" />
          </div>
        </div>
        <p className="mt-1 text-[10px] text-stone-500 font-medium">
          {stats.waiting} en attente
        </p>
      </div>

      {/* Barre 2 : Aujourd'hui */}
      <div>
        <div className="relative h-2 rounded-full bg-stone-200">
          {/* Fond rempli */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full overflow-hidden transition-all duration-700 ease-out ${
              justBrokeRecord ? 'bg-cta-500' : ''
            }`}
            style={{ width: `${todayPct}%` }}
          >
            <div className={`h-full w-full ${justBrokeRecord ? 'bg-cta-500' : 'bg-gradient-to-r from-primary-600 to-cta-500'}`} />
          </div>

          {/* Marqueur moyenne ○ */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full border-2 border-white bg-secondary-400 z-10"
            style={{ left: `${avgPos}%` }}
          />

          {/* Marqueur record ◆ */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2.5 rounded-sm rotate-45 border border-white z-10 transition-all duration-500 ${
              justBrokeRecord ? 'bg-cta-500 scale-150' : 'bg-secondary-500'
            }`}
            style={{ left: `${recPos}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-stone-500 font-medium">
            {stats.todayTotal} aujourd'hui
          </span>
          <span className="text-[10px] text-stone-400">
            moy. {stats.dailyAverage} · max. {stats.dailyRecord}
          </span>
        </div>
      </div>
    </div>
  )
}
```

**Corrections par rapport à la v1 :**
- Record comparé à `initialRecord` (capturé au premier fetch), pas au poll précédent
- `dailyRecord` exclut aujourd'hui dans le calcul serveur (évite l'auto-dépassement)
- Deux barres séparées avec sémantiques distinctes (attente vs cumul)
- Marqueurs en `z-10` au-dessus de la barre, pas clippés
- Couleurs design system : `primary-*`, `secondary-*`, `cta-*`, pas d'`amber-500` brut
- Fetch via endpoint serveur `/api/queue-stats` (4 nombres au lieu de 1000+ docs)

### 3. Intégration dans `Sidebar.tsx`

Identique à la v1 — entre `<SidebarNav>` et le footer :

```tsx
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

- Connecté en médecin cabinet → deux barres visibles
- Connecté en secrétaire/vitrine/RDV → aucune barre
- Ajouter des patients à la file → barre "En attente" se met à jour
- Traiter des patients → barre "Aujourd'hui" progresse
- Dépasser le record → ◆ pulse, barre passe en orange

### Fichiers créés/modifiés

| Créés | Modifiés |
|---|---|
| `api/queue-stats/route.ts` | `Sidebar.tsx` |
| `components/dashboard/QueueBar.tsx` | — |
