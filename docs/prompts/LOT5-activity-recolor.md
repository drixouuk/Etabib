# Issue — LOT 5 : Recoloration + polish de la page Activité

## Contexte

- `ActivityView.tsx` est déjà bien structuré (Recharts, sélecteur de période, 3 cartes stats, bar chart + 2 pie charts).
- Problème : les couleurs des graphiques sont en dur (`#0F766E`, `#D97706`, `#EF4444`, `#7C3AED`...) au lieu des tokens CSS.
- Les tokens `--chart-1` à `--chart-5` existent dans `globals.css:128-132` (`#0D9488`, `#14B8A6`, `#F59E0B`, `#F97316`, `#115E59`) et ne sont utilisés nulle part ailleurs.
- Aucune restructuration de données nécessaire — le calcul des métriques reste inchangé.

---

## Étape 1 — Installer le composant shadcn `chart`

```bash
pnpm dlx shadcn@latest add chart
```

## Étape 2 — Remplacer les couleurs en dur par des tokens CSS

**Fichier** : `apps/frontend/src/components/dashboard/ActivityView.tsx`

### 2a. Remplacer les constantes de couleur

Supprimer :
```typescript
const PRIMARY = '#0F766E'
const SECONDARY = '#D97706'
const LIGHT_GRID = '#E7E5E4'
const LIGHT_TEXT = '#A8A29E'
```

Remplacer par :
```typescript
const PRIMARY = 'var(--chart-1)'
const SECONDARY = 'var(--chart-3)'
const LIGHT_GRID = '#E7E5E4'
const LIGHT_TEXT = '#A8A29E'
```

### 2b. Remplacer les couleurs des pie charts

Supprimer :
```typescript
const PIE_COLORS = ['#0F766E', '#D97706', '#7C3AED', '#EF4444']
```

Remplacer par :
```typescript
const PIE_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
```

> Note : Recharts rend du SVG inline, donc `fill="var(--chart-1)"` fonctionne nativement via la prop `fill` du composant `Cell`. Aucun contournement nécessaire.

### 2c. Couleurs du pie chart "Provenance"

Si le composant a déjà `sourceData` (ajouté par un prompt antérieur), ajouter :

```typescript
const SOURCE_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-2)', 'var(--chart-5)', '#84CC16', '#64748B', '#EC4899']
```

Si `sourceData` n'est pas encore dans les props — l'ajouter comme **optionnel** (`sourceData?: { name: string; value: number }[]`) et ne rien planter si `undefined`.

## Étape 3 — Wrapper `ChartContainer` shadcn

### 3a. Imports

```tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
```

### 3b. Définir la config

Avant le `return` du composant :

```typescript
const chartConfig = {
  consultations: { label: 'Consultations', color: 'var(--chart-1)' },
  newPatients: { label: 'Nouveaux patients', color: 'var(--chart-3)' },
}
```

### 3c. Remplacer le bar chart existant

Actuellement (lignes ~91-106) :

```tsx
<ResponsiveContainer width="100%" height={250}>
  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
    <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
    <XAxis dataKey="date" tick={{ fontSize: 11, fill: LIGHT_TEXT }} />
    <YAxis tick={{ fontSize: 11, fill: LIGHT_TEXT }} width={30} allowDecimals={false} />
    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LIGHT_GRID}` }} />
    <Legend wrapperStyle={{ fontSize: 12 }} />
    <Bar dataKey="consultations" name="Consultations" fill={PRIMARY} radius={[4, 4, 0, 0]} />
    <Bar dataKey="newPatients" name="Nouveaux patients" fill={SECONDARY} radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

Remplacer par :

```tsx
<ChartContainer config={chartConfig} className="h-[250px] w-full">
  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
    <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
    <XAxis dataKey="date" tick={{ fontSize: 11, fill: LIGHT_TEXT }} />
    <YAxis tick={{ fontSize: 11, fill: LIGHT_TEXT }} width={30} allowDecimals={false} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Legend wrapperStyle={{ fontSize: 12 }} />
    <Bar dataKey="consultations" name="Consultations" fill="var(--color-consultations)" radius={[4, 4, 0, 0]} />
    <Bar dataKey="newPatients" name="Nouveaux patients" fill="var(--color-newPatients)" radius={[4, 4, 0, 0]} />
  </BarChart>
</ChartContainer>
```

> **Important** : `ChartContainer` remplace `ResponsiveContainer` — il utilise `className="h-[250px] w-full"` au lieu de `width="100%" height={250}`. Vérifier que le graphique s'affiche correctement.

### 3d. Appliquer le même pattern aux autres graphiques

Pour le **pie chart "Motifs de visite"** — conserver `ResponsiveContainer` (le pie chart ne bénéficie pas de `ChartContainer` de la même manière), mais remplacer le `Tooltip` manuel par `ChartTooltip` :

```tsx
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
// ...
<ChartTooltip content={<ChartTooltipContent />} />
```

Pour le **bar chart "Arrivées par heure"** — même traitement que le bar chart principal.

## Étape 4 — Pill de période actif : couleur charte

**Fichier** : `apps/frontend/src/components/dashboard/ActivityView.tsx`

Remplacer la classe du bouton actif (ligne ~50-52) :

```tsx
// Actuel :
className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
  period === p.value ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
}`}

// Remplacer par :
className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
  period === p.value ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
}`}
```

## Étape 5 — Cartes stats : hover lift

Dans les 3 cartes stats (lignes ~60-82), ajouter `transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5` :

```tsx
// Exemple pour la première carte — appliquer aux 3 :
<div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5">
```

> Note : si une classe utilitaire `card-hover` existe déjà dans `globals.css`, l'utiliser à la place.

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/components/dashboard/ActivityView.tsx` | Couleurs → tokens CSS, ChartContainer, pill actif, hover lift |

## Fichiers à créer

Aucun.

---

## Règles obligatoires

1. **Ne pas toucher au calcul des données** — `chartData`, `reasonData`, `hourlyData`, `sourceData` viennent des props, inchangés.
2. **Vérifier le rendu des tooltips** après migration — `ChartTooltipContent` formate les valeurs différemment du `Tooltip` manuel actuel. Tester avec des données réelles.
3. **Design system** : les tokens `--chart-1` à `--chart-5` sont la source unique pour les couleurs de graphiques.
4. **Aucune couleur hors charte restante** après ce lot (pas de violet, rouge, bleu, rose, lime ou gris non-charte dans les graphiques).
5. **Pas de `any`**.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `pnpm dlx shadcn@latest add chart`
2. `ActivityView.tsx` — constantes de couleur → tokens CSS
3. `ActivityView.tsx` — `ChartContainer` + `ChartTooltip` sur le bar chart
4. `ActivityView.tsx` — `ChartTooltip` sur les pie charts
5. `ActivityView.tsx` — pill période actif couleur charte
6. `ActivityView.tsx` — hover lift cartes stats
7. Build gate
