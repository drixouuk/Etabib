'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { computeMeasurementZScore, generateReferenceCurves, percentileColor } from '@/lib/growth-lms'
import { getReferenceTable, ageAtDate } from '@/lib/growth-tables'

type Consultation = { id: string; date: string; poids?: number | null; taille?: number | null; perimetreCranien?: number | null }

type Props = { consultations: Consultation[]; patientBirthDate?: string | null; patientGender?: string | null }

const PRIMARY = '#0F766E'
const LIGHT_GRID = '#E7E5E4'
const LIGHT_TEXT = '#A8A29E'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

type DataPoint = { date: string; rawDate: string; poids?: number | null; taille?: number | null; pc?: number | null }

export default function GrowthChart({ consultations, patientBirthDate, patientGender }: Props) {
  const points: DataPoint[] = consultations
    .filter((c) => c.poids || c.taille || c.perimetreCranien)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((c) => ({ date: formatDate(c.date), rawDate: c.date, poids: c.poids, taille: c.taille, pc: c.perimetreCranien }))

  const hasPoids = points.some((p) => p.poids != null)
  const hasTaille = points.some((p) => p.taille != null)
  const hasPc = points.some((p) => p.pc != null)
  const gender = patientGender === 'boy' || patientGender === 'girl' ? patientGender : null

  if (points.length < 2) {
    return (
      <div className="mb-8">
        <h3 className="mb-2 font-heading text-lg font-semibold text-ink">Courbes de croissance</h3>
        <p className="text-sm text-ink-softer">Pas encore assez de données pour une courbe de croissance.</p>
      </div>
    )
  }

  // Compute percentile-enriched data
  const poidsData = points
    .filter(p => p.poids != null && patientBirthDate && gender)
    .map(p => {
      const age = ageAtDate(patientBirthDate!, p.rawDate)
      const table = getReferenceTable(age, gender as 'boy' | 'girl', 'weight')
      if (table.length === 0) return { ...p, pColor: PRIMARY, pPct: null }
      const { percentile } = computeMeasurementZScore(p.poids!, age, table)
      return { ...p, age, pColor: percentileColor(percentile), pPct: percentile }
    })

  const tailleData = points
    .filter(p => p.taille != null && patientBirthDate && gender)
    .map(p => {
      const age = ageAtDate(patientBirthDate!, p.rawDate)
      const table = getReferenceTable(age, gender as 'boy' | 'girl', 'height')
      if (table.length === 0) return { ...p, tColor: PRIMARY, tPct: null }
      const { percentile } = computeMeasurementZScore(p.taille!, age, table)
      return { ...p, age, tColor: percentileColor(percentile), tPct: percentile }
    })

  // Compute percentile-enriched data for PC
  const pcData = points
    .filter(p => p.pc != null && patientBirthDate && gender)
    .map(p => {
      const age = ageAtDate(patientBirthDate!, p.rawDate)
      const table = getReferenceTable(age, gender as 'boy' | 'girl', 'pc')
      if (table.length === 0) return { ...p, pcColor: PRIMARY, pcPct: null }
      const { percentile } = computeMeasurementZScore(p.pc!, age, table)
      return { ...p, age, pcColor: percentileColor(percentile), pcPct: percentile }
    })

  // Generate reference curves from the latest point's age
  const lastAge = points.length > 0 && patientBirthDate ? ageAtDate(patientBirthDate, points[points.length - 1].rawDate) : null

  const weightCurves = lastAge != null && gender
    ? (() => { const t = getReferenceTable(lastAge, gender as 'boy' | 'girl', 'weight'); return t.length > 0 ? generateReferenceCurves(t) : null })()
    : null

  const heightCurves = lastAge != null && gender
    ? (() => { const t = getReferenceTable(lastAge, gender as 'boy' | 'girl', 'height'); return t.length > 0 ? generateReferenceCurves(t) : null })()
    : null

  const pcCurves = lastAge != null && gender
    ? (() => { const t = getReferenceTable(lastAge, gender as 'boy' | 'girl', 'pc'); return t.length > 0 ? generateReferenceCurves(t) : null })()
    : null

  const chartProps = { margin: { top: 4, right: 4, bottom: 0, left: 0 } }

  const renderWeightChart = () => (
    <div className="rounded-xl border border-warm bg-white p-3 shadow-warm-sm">
      <p className="mb-1 text-xs font-medium text-ink-soft">Poids (kg)</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={poidsData} {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
          <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10, fill: LIGHT_TEXT }} label={{ value: 'Âge (mois)', position: 'insideBottom', offset: -5, fontSize: 10, fill: LIGHT_TEXT }} />
          <YAxis tick={{ fontSize: 10, fill: LIGHT_TEXT }} width={32} />
          {weightCurves && <>
            <Line data={weightCurves} dataKey="p97" stroke="#F97316" strokeWidth={1} strokeDasharray="4 4" dot={false} name="97e perc." />
            <Line data={weightCurves} dataKey="p50" stroke="#A8A29E" strokeWidth={1.5} dot={false} name="Médiane" />
            <Line data={weightCurves} dataKey="p3" stroke="#EF4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="3e perc." />
          </>}
          <Line type="monotone" dataKey="poids" stroke={PRIMARY} strokeWidth={2}
            dot={(props: any) => { const e = props.payload; return <circle cx={props.cx} cy={props.cy} r={4} fill={e.pColor || PRIMARY} stroke="white" strokeWidth={1.5} /> }}
            name="Patient" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LIGHT_GRID}` }}
            labelFormatter={(label: any) => `${label} mois`}
            formatter={(value: any, _name: any, props: any) => {
              if (props?.payload?.pPct != null) return [`${value} kg (${props.payload.pPct}e perc.)`, 'Patient']
              return [value, 'Patient']
            }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  const renderHeightChart = () => (
    <div className="rounded-xl border border-warm bg-white p-3 shadow-warm-sm">
      <p className="mb-1 text-xs font-medium text-ink-soft">Taille (cm)</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={tailleData} {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
          <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10, fill: LIGHT_TEXT }} label={{ value: 'Âge (mois)', position: 'insideBottom', offset: -5, fontSize: 10, fill: LIGHT_TEXT }} />
          <YAxis tick={{ fontSize: 10, fill: LIGHT_TEXT }} width={32} />
          {heightCurves && <>
            <Line data={heightCurves} dataKey="p97" stroke="#F97316" strokeWidth={1} strokeDasharray="4 4" dot={false} name="97e perc." />
            <Line data={heightCurves} dataKey="p50" stroke="#A8A29E" strokeWidth={1.5} dot={false} name="Médiane" />
            <Line data={heightCurves} dataKey="p3" stroke="#EF4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="3e perc." />
          </>}
          <Line type="monotone" dataKey="taille" stroke={PRIMARY} strokeWidth={2}
            dot={(props: any) => { const e = props.payload; return <circle cx={props.cx} cy={props.cy} r={4} fill={e.tColor || PRIMARY} stroke="white" strokeWidth={1.5} /> }}
            name="Patient" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LIGHT_GRID}` }}
            labelFormatter={(label: any) => `${label} mois`}
            formatter={(value: any, _name: any, props: any) => {
              if (props?.payload?.tPct != null) return [`${value} cm (${props.payload.tPct}e perc.)`, 'Patient']
              return [value, 'Patient']
            }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  const renderPCChart = () => (
    <div className="rounded-xl border border-warm bg-white p-3 shadow-warm-sm">
      <p className="mb-1 text-xs font-medium text-ink-soft">Périmètre crânien (cm)</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={pcData.length > 0 ? pcData : points} {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
          <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10, fill: LIGHT_TEXT }} label={{ value: 'Âge (mois)', position: 'insideBottom', offset: -5, fontSize: 10, fill: LIGHT_TEXT }} />
          <YAxis tick={{ fontSize: 10, fill: LIGHT_TEXT }} width={32} />
          {pcCurves && <>
            <Line data={pcCurves} dataKey="p97" stroke="#F97316" strokeWidth={1} strokeDasharray="4 4" dot={false} name="97e perc." />
            <Line data={pcCurves} dataKey="p50" stroke="#A8A29E" strokeWidth={1.5} dot={false} name="Médiane" />
            <Line data={pcCurves} dataKey="p3" stroke="#EF4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="3e perc." />
          </>}
          <Line type="monotone" dataKey="pc" stroke={PRIMARY} strokeWidth={2}
            dot={(props: any) => { const e = props.payload; return <circle cx={props.cx} cy={props.cy} r={4} fill={e.pcColor || PRIMARY} stroke="white" strokeWidth={1.5} /> }}
            name="Patient" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LIGHT_GRID}` }}
            labelFormatter={(label: any) => `${label} mois`}
            formatter={(value: any, _name: any, props: any) => {
              if (props?.payload?.pcPct != null) return [`${value} cm (${props.payload.pcPct}e perc.)`, 'Patient']
              return [value, 'Patient']
            }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  return (
    <div className="mb-8">
      <h3 className="mb-3 font-heading text-lg font-semibold text-ink">Courbes de croissance</h3>
      <div className={`grid grid-cols-1 gap-4 ${(hasPoids && hasTaille) || (hasPoids && hasPc) || (hasTaille && hasPc) ? 'md:grid-cols-3' : ''}`}>
        {hasPoids && renderWeightChart()}
        {hasTaille && renderHeightChart()}
        {hasPc && renderPCChart()}
      </div>
      {gender && patientBirthDate && (
        <p className="mt-2 text-xs text-ink-softer">
          Courbes de référence : OMS (0–24 mois) / CDC (2–20 ans). Les percentiles sont indicatifs et ne constituent pas un diagnostic.
        </p>
      )}
    </div>
  )
}
