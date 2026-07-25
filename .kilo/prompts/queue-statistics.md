# Issue : Statistiques d'occupation de la file d'attente

## Contexte

- La page Activité affiche déjà les nouveaux patients + consultations (compteurs + bar chart), avec sélecteur de période jour/semaine/mois/année.
- Mais aucune stat sur la **file d'attente** : combien de patients vus, répartition par motif, pics horaires.
- `recharts` est déjà installé et utilisé (BarChart, LineChart). On va ajouter PieChart.
- Les données viennent de `queue-items` (déjà accessible via CMS).

---

## Travail à faire

### 1. Étendre la page Activité — fetch des données file d'attente

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx`

Ajouter un fetch pour les queue-items complétés dans la période :

```tsx
const [patientsData, consultationsData, queueData] = await Promise.all([
  // ... existing fetches
  fetchCMS<{ docs: { id: string; visitReason: string; arrivalTime: string; status: string }[] }>(
    `/api/queue-items?where[tenant][equals]=${tenantId}&where[arrivalTime][greater_than_equal]=${isoStart}&depth=0&limit=5000`,
    { revalidate: 0 },
  ),
])
```

Puis extraire les metriques :

```tsx
const queueItems = queueData?.docs ?? []

// Patients vus (completed)
const completedToday = queueItems.filter(i => i.status === 'completed').length

// Répartition par motif de visite
const reasonCounts: Record<string, number> = { consultation: 0, controle: 0, vaccin: 0, urgence: 0 }
for (const item of queueItems) {
  if (reasonCounts[item.visitReason] !== undefined) {
    reasonCounts[item.visitReason]++
  }
}
const reasonData = Object.entries(reasonCounts)
  .filter(([_, count]) => count > 0)
  .map(([reason, count]) => ({ name: visitReasonLabel(reason), value: count }))
```

Fonction utilitaire `visitReasonLabel` (déjà dans WaitingRoomList — la dupliquer ou l'importer) :

```tsx
function visitReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    consultation: 'Consultation',
    controle: 'Contrôle',
    vaccin: 'Vaccin',
    urgence: 'Urgence',
  }
  return labels[reason] || reason
}
```

Répartition par heure :

```tsx
const hourlyCounts: Record<number, number> = {}
for (let h = 8; h <= 18; h++) hourlyCounts[h] = 0
for (const item of queueItems) {
  const hour = new Date(item.arrivalTime).getHours()
  if (hour >= 8 && hour <= 18) hourlyCounts[hour]++
}
const hourlyData = Object.entries(hourlyCounts).map(([hour, count]) => ({
  hour: `${hour}h`,
  count,
}))
```

Passer les nouvelles données à `ActivityView` :

```tsx
<ActivityView
  period={period}
  newPatients={patients.length}
  consultationsDone={consultations.length}
  completedToday={completedToday}
  reasonData={reasonData}
  hourlyData={hourlyData}
  chartData={chartData}
/>
```

### 2. Étendre ActivityView — nouveaux widgets

**Fichier** : `apps/frontend/src/components/dashboard/ActivityView.tsx`

#### 2a. Props étendues

```tsx
import { PieChart, Pie, Cell } from 'recharts'
import { UserPlus, Stethoscope, CheckCheck } from 'lucide-react'

type Props = {
  period: 'day' | 'week' | 'month' | 'year'
  newPatients: number
  consultationsDone: number
  completedToday: number
  reasonData: { name: string; value: number }[]
  hourlyData: { hour: string; count: number }[]
  chartData: { date: string; consultations: number; newPatients: number }[]
}

// Couleurs pour le pie chart
const PIE_COLORS = ['#0F766E', '#D97706', '#7C3AED', '#EF4444']
const reasonColorMap: Record<string, string> = {
  Consultation: '#0F766E',
  Contrôle: '#D97706',
  Vaccin: '#7C3AED',
  Urgence: '#EF4444',
}
```

#### 2b. 3ᵉ compteur : Patients vus

Ajouter après les deux compteurs existants (ligne ~82) :

```tsx
<div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
  <div className="flex items-center gap-3">
    <span className="flex size-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
      <CheckCheck className="size-5" />
    </span>
    <div>
      <p className="font-heading text-3xl font-bold text-stone-800">{completedToday}</p>
      <p className="text-sm text-stone-500">Patients vus</p>
    </div>
  </div>
</div>
```

La grille passe de `grid-cols-2` à `grid-cols-3` :

```tsx
<div className="mb-6 grid grid-cols-3 gap-4">
```

#### 2c. Graphique camembert — motifs de visite

Ajouter après le bar chart existant (avant la fermeture `{hasData && (...)}`) :

```tsx
{reasonData.length > 0 && (
  <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div>
      <h3 className="mb-2 font-heading text-sm font-semibold text-stone-700">Motifs de visite</h3>
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={reasonData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {reasonData.map((entry, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LIGHT_GRID}` }}
              formatter={(value, name) => [value, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Arrivées par heure */}
    <div>
      <h3 className="mb-2 font-heading text-sm font-semibold text-stone-700">Arrivées par heure</h3>
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: LIGHT_TEXT }} />
            <YAxis tick={{ fontSize: 10, fill: LIGHT_TEXT }} width={28} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LIGHT_GRID}` }} />
            <Bar dataKey="count" name="Arrivées" fill={PRIMARY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
)}
```

#### 2d. Gestion du cas vide

Le pie chart et hourly chart sont déjà conditionnés à `reasonData.length > 0`. Pas de changement sur le message "Aucune donnée".

---

## Ce qui est hors scope

- **Temps d'attente moyen** — nécessiterait un champ `startedAt` ou `consultationStartTime` sur `QueueItems` qui n'existe pas. On pourra l'ajouter dans un lot ultérieur.
- **Filtre par médecin** (tier clinique) — les stats restent globales pour le tenant. Le filtre par médecin viendra avec le besoin.
- **Export CSV des stats** — pas demandé pour le moment.

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx` | Fetch queue-items, extraire métriques, passer props |
| `apps/frontend/src/components/dashboard/ActivityView.tsx` | Props étendues, 3ᵉ compteur, pie chart motifs, bar chart horaires |

## Fichiers à créer

Aucun.

---

## Règles obligatoires

1. **Design system** : tokens sémantiques, couleurs du pie chart cohérentes avec la palette existante (primary teal, secondary amber, purple pour vaccin, red pour urgence).
2. **Pas de `any`** sans justification.
3. **Réutilisation** : `visitReasonLabel` déjà présent dans `WaitingRoomList.tsx`. Soit l'importer (nécessite de l'exporter), soit la dupliquer dans `activity/page.tsx` (plus simple, fonction triviale).
4. **Responsive** : `grid-cols-1 lg:grid-cols-2` pour les graphs (empilés sur mobile, côte à côte sur desktop).
5. **Performance** : `limit=5000` sur le fetch queue-items (même pattern que les autres fetches de la page Activité).

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `activity/page.tsx` — fetch queue-items + extraction métriques
2. `ActivityView.tsx` — compteur + pie chart + bar chart
3. Build gate
