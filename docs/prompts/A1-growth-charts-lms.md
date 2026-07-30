# Feature A.1 — Courbes de croissance avec percentiles LMS (OMS/CDC)

## Contexte

- `GrowthChart.tsx` trace aujourd'hui les valeurs brutes `poids`/`taille`/`perimetreCranien` dans le temps — **aucun calcul de percentile, pas de courbe de référence**.
- Ce n'est pas une courbe de croissance au sens clinique. C'est un simple graphique de suivi.
- L'objectif : superposer les mesures du patient sur les courbes de référence OMS (0–2 ans) et CDC (2–20 ans), avec calcul de percentile via la méthode LMS.

---

## Architecture

```
lib/growth-lms.ts
  → computeZScore(measurement, ageMonths, gender, table) → z-score
  → zScoreToPercentile(z) → percentile (0-100)
  → getReferenceCurves(ageMonths, gender, measurement) → [{ age, p3, p50, p97 }]

data/growth/who-wfa-boys.json   (Weight-for-Age, Boys, 0-24 months)
data/growth/who-wfa-girls.json  (Weight-for-Age, Girls, 0-24 months)
data/growth/who-hfa-boys.json   (Height-for-Age, Boys, 0-24 months)
data/growth/who-hfa-girls.json  (Height-for-Age, Girls, 0-24 months)
data/growth/cdc-wfa-boys.json   (Weight-for-Age, Boys, 2-20 years)
data/growth/cdc-wfa-girls.json  (Weight-for-Age, Girls, 2-20 years)
data/growth/cdc-hfa-boys.json   (Height-for-Age, Boys, 2-20 years)
data/growth/cdc-hfa-girls.json  (Height-for-Age, Girls, 2-20 years)

GrowthChart.tsx
  → Pour chaque mesure (poids, taille) :
    → Calculer l'âge du patient à la date de la mesure
    → Déterminer la table OMS (< 2 ans) ou CDC (≥ 2 ans)
    → Calculer le Z-score et le percentile
    → Générer les courbes de référence (p3, p50, p97)
    → Afficher le graphique : courbes de référence en fond + points patient
    → Colorer les points selon le percentile (< 3e : rouge, 3-97 : teal, > 97e : orange)
    → Afficher le percentile dans le tooltip
```

**Pas de courbe de périmètre crânien pour le MVP** — les tables OMS PC existent mais sont moins prioritaires. Le graphique PC actuel (valeurs brutes) est conservé tel quel.

---

## Travail à faire

### 1. Formule LMS + utilitaires

**Fichier à créer** : `apps/frontend/src/lib/growth-lms.ts`

```typescript
// ============================================================
// Méthode LMS (Box-Cox) — standard OMS/CDC
// Z = ((X/M)^L - 1) / (L*S)  si L ≠ 0
// Z = ln(X/M) / S              si L = 0
// ============================================================

type LMSEntry = [number, number, number] // [L, M, S]
type ReferenceTable = [number, ...LMSEntry][] // [ageMonths, L, M, S][]
type MeasurementType = 'weight' | 'height'

/**
 * Calcule le Z-score d'une mesure selon la méthode LMS.
 */
export function computeZScore(
  measurement: number,
  L: number,
  M: number,
  S: number,
): number {
  if (L === 0) {
    return Math.log(measurement / M) / S
  }
  return (Math.pow(measurement / M, L) - 1) / (L * S)
}

/**
 * Convertit un Z-score en percentile (0-100).
 * Approximation polynomiale de la fonction de répartition normale.
 */
export function zScoreToPercentile(z: number): number {
  // Approximation de la CDF normale (Abramowitz & Stegun)
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  const cdf = 0.5 * (1 + sign * erf)
  return Math.round(cdf * 1000) / 10 // 1 décimale
}

/**
 * Interpole linéairement entre deux entrées de table LMS.
 */
function interpolateLMS(
  table: ReferenceTable,
  ageMonths: number,
): { L: number; M: number; S: number } {
  if (ageMonths <= table[0][0]) {
    return { L: table[0][1], M: table[0][2], S: table[0][3] }
  }
  const last = table[table.length - 1]
  if (ageMonths >= last[0]) {
    return { L: last[1], M: last[2], S: last[3] }
  }

  for (let i = 0; i < table.length - 1; i++) {
    const [age1, L1, M1, S1] = table[i]
    const [age2, L2, M2, S2] = table[i + 1]
    if (ageMonths >= age1 && ageMonths <= age2) {
      const ratio = (ageMonths - age1) / (age2 - age1)
      return {
        L: L1 + ratio * (L2 - L1),
        M: M1 + ratio * (M2 - M1),
        S: S1 + ratio * (S2 - S1),
      }
    }
  }
  // fallback
  return { L: last[1], M: last[2], S: last[3] }
}

/**
 * Calcule le Z-score d'une mesure par rapport à la table de référence.
 */
export function computeMeasurementZScore(
  value: number,
  ageMonths: number,
  table: ReferenceTable,
): { z: number; percentile: number } {
  const { L, M, S } = interpolateLMS(table, ageMonths)
  const z = computeZScore(value, L, M, S)
  // Plafonner le Z-score pour éviter des percentiles extrêmes
  const clampedZ = Math.max(-5, Math.min(5, z))
  return { z: clampedZ, percentile: zScoreToPercentile(clampedZ) }
}

/**
 * Génère les courbes de référence (p3, p15, p50, p85, p97)
 * pour chaque âge dans la table.
 */
export function generateReferenceCurves(
  table: ReferenceTable,
): { age: number; p3: number; p50: number; p97: number }[] {
  // Z-scores pour les percentiles standards
  const Z_VALUES = { p3: -1.881, p50: 0, p97: 1.881 }

  return table.map(([age, L, M, S]) => {
    const computeValue = (z: number) => {
      if (L === 0) return M * Math.exp(S * z)
      return M * Math.pow(1 + L * S * z, 1 / L)
    }
    return {
      age,
      p3: parseFloat(computeValue(Z_VALUES.p3).toFixed(2)),
      p50: parseFloat(computeValue(Z_VALUES.p50).toFixed(2)),
      p97: parseFloat(computeValue(Z_VALUES.p97).toFixed(2)),
    }
  })
}

/**
 * Détermine la couleur du point selon le percentile.
 */
export function percentileColor(percentile: number): string {
  if (percentile < 3) return '#EF4444'  // red
  if (percentile > 97) return '#F97316' // orange
  return '#0F766E'                       // teal (normal)
}

/**
 * Détermine le label de la zone de percentile.
 */
export function percentileLabel(percentile: number): string {
  if (percentile < 3) return 'Sous le 3e percentile'
  if (percentile > 97) return 'Au-dessus du 97e percentile'
  if (percentile < 15) return 'Sous le 15e percentile'
  if (percentile > 85) return 'Au-dessus du 85e percentile'
  return 'Dans la norme'
}
```

### 2. Données de référence OMS (0–24 mois)

**Dossier à créer** : `apps/frontend/src/data/growth/`

Créer 4 fichiers JSON contenant les tables LMS au format `[ageMonths, L, M, S][]`.

**Les données doivent être sourcées depuis les standards publics OMS/CDC, pas générées par l'agent.** L'agent doit vendoriser ces données à partir des sources officielles :

- OMS : https://www.who.int/tools/child-growth-standards/standards (onglet "Weight-for-age", "Length/height-for-age")
- CDC : https://www.cdc.gov/growthcharts/percentile_data_files.htm

Format attendu pour chaque fichier JSON :

```json
[
  [0, 0.3809, 3.3464, 0.14602],
  [1, 0.1714, 4.4709, 0.13395],
  [2, -0.0144, 5.5675, 0.12385],
  ...
]
```

**Fichiers à créer :**

| Fichier | Source | Plage d'âge |
|---------|--------|-------------|
| `data/growth/who-wfa-boys.json` | OMS Weight-for-age, Boys | 0–24 mois |
| `data/growth/who-wfa-girls.json` | OMS Weight-for-age, Girls | 0–24 mois |
| `data/growth/who-hfa-boys.json` | OMS Length/height-for-age, Boys | 0–24 mois |
| `data/growth/who-hfa-girls.json` | OMS Length/height-for-age, Girls | 0–24 mois |
| `data/growth/cdc-wfa-boys.json` | CDC Weight-for-age, Boys | 24–240 mois |
| `data/growth/cdc-wfa-girls.json` | CDC Weight-for-age, Girls | 24–240 mois |
| `data/growth/cdc-hfa-boys.json` | CDC Stature-for-age, Boys | 24–240 mois |
| `data/growth/cdc-hfa-girls.json` | CDC Stature-for-age, Girls | 24–240 mois |

> **Note pour l'agent** : les tables CDC utilisent un format différent (percentiles pré-calculés par âge). Convertir au format `[ageMonths, L, M, S]` en calculant L/M/S à rebours depuis les percentiles publiés, ou utiliser une interpolation simplifiée (stockage direct des valeurs p3/p50/p97 par âge). Si la conversion LMS est trop complexe, stocker directement les valeurs aux percentiles : `[ageMonths, p3, p50, p97]` et adapter la fonction `generateReferenceCurves`.

### 3. Module de chargement des tables

**Fichier à créer** : `apps/frontend/src/lib/growth-tables.ts`

```typescript
import { ReferenceTable } from './growth-lms'

// Chargement statique des tables (vendorisées dans le bundle)
import whoWfaBoys from '@/data/growth/who-wfa-boys.json'
import whoWfaGirls from '@/data/growth/who-wfa-girls.json'
import whoHfaBoys from '@/data/growth/who-hfa-boys.json'
import whoHfaGirls from '@/data/growth/who-hfa-girls.json'
import cdcWfaBoys from '@/data/growth/cdc-wfa-boys.json'
import cdcWfaGirls from '@/data/growth/cdc-wfa-girls.json'
import cdcHfaBoys from '@/data/growth/cdc-hfa-boys.json'
import cdcHfaGirls from '@/data/growth/cdc-hfa-girls.json'

type Gender = 'boy' | 'girl'
type Measurement = 'weight' | 'height'

const WHO_TABLES: Record<string, Record<string, ReferenceTable>> = {
  boy: {
    weight: whoWfaBoys as ReferenceTable,
    height: whoHfaBoys as ReferenceTable,
  },
  girl: {
    weight: whoWfaGirls as ReferenceTable,
    height: whoHfaGirls as ReferenceTable,
  },
}

const CDC_TABLES: Record<string, Record<string, ReferenceTable>> = {
  boy: {
    weight: cdcWfaBoys as ReferenceTable,
    height: cdcHfaBoys as ReferenceTable,
  },
  girl: {
    weight: cdcWfaGirls as ReferenceTable,
    height: cdcHfaGirls as ReferenceTable,
  },
}

/**
 * Sélectionne la table de référence selon l'âge et le genre.
 * OMS : 0–24 mois, CDC : 24+ mois.
 */
export function getReferenceTable(
  ageMonths: number,
  gender: Gender,
  measurement: Measurement,
): ReferenceTable {
  const tables = ageMonths < 24 ? WHO_TABLES : CDC_TABLES
  return tables[gender]?.[measurement] || []
}

/**
 * Calcule l'âge en mois à une date donnée, depuis la date de naissance.
 */
export function ageAtDate(birthDateISO: string, measurementDateISO: string): number {
  const birth = new Date(birthDateISO)
  const measure = new Date(measurementDateISO)
  return (measure.getFullYear() - birth.getFullYear()) * 12 + measure.getMonth() - birth.getMonth()
}
```

### 4. Refonte GrowthChart.tsx

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/GrowthChart.tsx`

#### 4a. Props enrichies

Ajouter `patientBirthDate` et `patientGender` aux props :

```typescript
type Props = {
  consultations: Consultation[]
  patientBirthDate?: string | null
  patientGender?: string | null
}
```

#### 4b. Calcul des percentiles par mesure

```typescript
import { computeMeasurementZScore, generateReferenceCurves, percentileColor, percentileLabel } from '@/lib/growth-lms'
import { getReferenceTable, ageAtDate } from '@/lib/growth-tables'

// Pour chaque point de donnée avec un poids :
const poidsData = points
  .filter(p => p.poids != null && patientBirthDate && patientGender)
  .map(p => {
    const ageMonths = ageAtDate(patientBirthDate!, p.rawDate)
    const table = getReferenceTable(ageMonths, patientGender as 'boy' | 'girl', 'weight')
    if (table.length === 0) return { ...p, percentile: null, color: PRIMARY }
    const { percentile } = computeMeasurementZScore(p.poids!, ageMonths, table)
    return { ...p, poidsPercentile: percentile, poidsColor: percentileColor(percentile) }
  })
```

Même pattern pour `tailleData`.

#### 4c. Courbes de référence

Générer les courbes pour le graphique :

```typescript
const weightCurves = patientBirthDate && patientGender && points.length > 0
  ? (() => {
      const ageAtLastPoint = ageAtDate(patientBirthDate, points[points.length - 1].rawDate)
      const table = getReferenceTable(ageAtLastPoint, patientGender as 'boy' | 'girl', 'weight')
      return table.length > 0 ? generateReferenceCurves(table) : null
    })()
  : null
```

#### 4d. Nouveau rendu du graphique poids

Remplacer le LineChart actuel par un graphique avec courbes de référence + points patient :

```tsx
{hasPoids && (
  <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
    <p className="mb-1 text-xs font-medium text-stone-500">Poids (kg)</p>
    <ResponsiveContainer width="100%" height={220}>
      <LineChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
        <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']}
          tick={{ fontSize: 10, fill: LIGHT_TEXT }}
          label={{ value: 'Âge (mois)', position: 'insideBottom', offset: -5, fontSize: 10, fill: LIGHT_TEXT }} />

        {/* Courbes de référence en fond */}
        {weightCurves && (
          <>
            <Line data={weightCurves} dataKey="p97" stroke="#F97316" strokeWidth={1} strokeDasharray="4 4" dot={false} name="97e perc." />
            <Line data={weightCurves} dataKey="p50" stroke="#A8A29E" strokeWidth={1.5} dot={false} name="Médiane" />
            <Line data={weightCurves} dataKey="p3" stroke="#EF4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="3e perc." />
          </>
        )}

        {/* Ligne patient */}
        <Line data={poidsData} dataKey="poids" stroke={PRIMARY} strokeWidth={2}
          dot={(props: any) => {
            const entry = props.payload
            const color = entry.poidsColor || PRIMARY
            return <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />
          }}
          name="Patient" />

        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E7E5E4' }}
          formatter={(value: any, name: string, props: any) => {
            if (name === 'Patient' && props.payload?.poidsPercentile != null) {
              return [`${value} kg (${props.payload.poidsPercentile}ᵉ perc.)`, name]
            }
            return [value, name]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
)}
```

Même pattern pour la taille.

#### 4e. Conserver le graphique PC existant

Le périmètre crânien reste en valeurs brutes (pas de courbes OMS PC pour le MVP) :

```tsx
{hasPc && (
  // ... le LineChart existant pour PC, inchangé
)}
```

#### 4f. Note de bas de page

Ajouter un petit texte de disclaimer en bas du composant :

```tsx
<p className="mt-2 text-xs text-stone-400">
  Courbes de référence : OMS (0–24 mois) / CDC (2–20 ans). Les percentiles sont indicatifs et ne constituent pas un diagnostic.
</p>
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `apps/frontend/src/lib/growth-lms.ts` | Formule LMS, Z-score, percentiles, courbes de référence |
| `apps/frontend/src/lib/growth-tables.ts` | Chargement et sélection des tables OMS/CDC |
| `apps/frontend/src/data/growth/who-wfa-boys.json` | Table OMS Poids/Âge Garçons 0-24 mois |
| `apps/frontend/src/data/growth/who-wfa-girls.json` | Table OMS Poids/Âge Filles 0-24 mois |
| `apps/frontend/src/data/growth/who-hfa-boys.json` | Table OMS Taille/Âge Garçons 0-24 mois |
| `apps/frontend/src/data/growth/who-hfa-girls.json` | Table OMS Taille/Âge Filles 0-24 mois |
| `apps/frontend/src/data/growth/cdc-wfa-boys.json` | Table CDC Poids/Âge Garçons 2-20 ans |
| `apps/frontend/src/data/growth/cdc-wfa-girls.json` | Table CDC Poids/Âge Filles 2-20 ans |
| `apps/frontend/src/data/growth/cdc-hfa-boys.json` | Table CDC Taille/Âge Garçons 2-20 ans |
| `apps/frontend/src/data/growth/cdc-hfa-girls.json` | Table CDC Taille/Âge Filles 2-20 ans |

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/GrowthChart.tsx` | Ajouter props birthDate/gender, courbes référence, percentiles, couleurs |
| `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/[id]/page.tsx` | Passer `patientBirthDate` et `patientGender` à GrowthChart |

---

## Règles obligatoires

1. **Données de référence NON générées par IA** — l'agent doit sourcer les tables depuis les standards publics OMS/CDC et les convertir au format attendu. Ne pas inventer de données LMS.
2. **Disclaimer clinique obligatoire** : "Les percentiles sont indicatifs et ne constituent pas un diagnostic."
3. **Design system** : tokens sémantiques. Rouge pour < 3e, orange pour > 97e, teal pour normal.
4. **Pas de diagnostic automatique** — conformément à la décision déjà actée d'écarter toute logique clinique automatique.
5. **Pas de `any`** sans justification.
6. **Pas de nouvelle dépendance npm** — tout est du calcul mathématique pur + recharts déjà installé.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```

## Ordre d'implémentation

1. `growth-lms.ts` — formules + utilitaires
2. `data/growth/*.json` — vendorisation des tables (8 fichiers)
3. `growth-tables.ts` — chargement + sélection
4. `GrowthChart.tsx` — refonte avec courbes de référence + percentiles
5. `patients/[id]/page.tsx` — passer birthDate + gender
6. Build gate
