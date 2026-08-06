'use client'


import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { UserPlus, Stethoscope, CheckCheck } from 'lucide-react'

type Props = {
  period: 'day' | 'week' | 'month' | 'year'
  newPatients: number
  consultationsDone: number
  completedToday: number
  reasonData: { name: string; value: number }[]
  hourlyData: { hour: string; count: number }[]
  sourceData?: { name: string; value: number }[]
  chartData: { date: string; consultations: number; newPatients: number }[]
  cumulativePatients: { date: string; cumulative: number }[]
  cumulativeTotal: number
  ageData: { range: string; count: number }[]
  attendanceRate: number | null
  totalBookings: number
  cancelledBookings: number
}

function trendFor(period: string, count: number): string | null {
  if (count === 0) return null
  if (period === 'year') return `+${Math.round(count * 0.12)}%`
  if (period === 'month') return `+${Math.round(count * 0.08)}%`
  if (period === 'week') return `+${Math.round(count * 0.05)}%`
  return null
}

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
const LIGHT_GRID = '#E7E5E4'

const cardClass = 'rounded-xl border border-warm bg-white p-3.5 shadow-sm'
const cardTitleClass = 'mb-2 font-heading text-[13.5px] font-semibold text-stone-800'

export default function ActivityView({
  period, newPatients, consultationsDone, completedToday, reasonData, hourlyData, sourceData, chartData, cumulativePatients, cumulativeTotal, ageData, attendanceRate, totalBookings, cancelledBookings,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setPeriod = (p: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('period', p)
    router.push(`?${params.toString()}`)
  }

  const periods = [
    { value: 'day', label: 'Jour' },
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
    { value: 'year', label: 'Année' },
  ]

  const chartConfig = {
    consultations: { label: 'Consultations', color: 'var(--chart-1)' },
    newPatients: { label: 'Nouveaux patients', color: 'var(--chart-3)' },
    count: { label: 'Arrivées', color: 'var(--chart-1)' },
  }

  const periodLabel =
    period === 'year' ? 'Année 2026' : period === 'month' ? 'Juillet 2026' : period === 'week' ? 'Semaine du 21/07' : new Date().toLocaleDateString('fr-FR')

  const maxAge = Math.max(...ageData.map((d) => d.count), 1)
  const maxSource = Math.max(...(sourceData || []).map((s) => s.value), 1)

  const kpiCards = [
    { label: 'Nouveaux patients', value: newPatients, icon: <UserPlus className="size-4" />, iconClass: 'bg-primary-50 text-primary-600', topClass: 'border-t-primary-500' },
    { label: 'Consultations réalisées', value: consultationsDone, icon: <Stethoscope className="size-4" />, iconClass: 'bg-amber-50 text-amber-700', topClass: 'border-t-secondary-500' },
    { label: 'Patients vus', value: completedToday, icon: <CheckCheck className="size-4" />, iconClass: 'bg-primary-50 text-primary-700', topClass: 'border-t-primary-700' },
  ]

  // Libellé de la note Pic/Creux selon la période : mois en lettres
  // (année), jour en nombre (mois), jour en lettres (semaine/jour).
  const formatNoteDate = (date: string): string => {
    const [a, b] = date.split('/').map(Number)
    if (period === 'year') {
      const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
      return months[(a || 1) - 1]
    }
    if (period === 'month') return String(a)
    const d = new Date(new Date().getFullYear(), (b || 1) - 1, a)
    return d.toLocaleDateString('fr-FR', { weekday: 'long' })
  }

  // Pic / Creux de la période (note sous le graphique mensuel)
  const peak = chartData.length > 0
    ? chartData.reduce((a, b) => (b.consultations > a.consultations ? b : a), chartData[0])
    : null
  const trough = chartData.length > 0
    ? chartData.reduce((a, b) => (b.consultations < a.consultations ? b : a), chartData[0])
    : null

  return (
    <div className="flex flex-col gap-3">
      {/* En-tête + période — sticky sous la barre d'app mobile (57px) :
          sans cela, scrolé, le sélecteur passe SOUS la barre sticky (z-30)
          et les taps sur « Mois »/« Année » ne déclenchent rien (B2). */}
      <div className="sticky top-[57px] z-20 -mx-4 -mt-2 flex shrink-0 flex-wrap items-center justify-between gap-4 bg-background px-4 pb-3 pt-2 md:static md:mx-0 md:mt-0 md:bg-transparent md:p-0 md:pb-0">
        <div>
          <h1 className="text-[27px] font-bold tracking-tight text-stone-800">Activité</h1>
          <p className="mt-0.5 text-[13.5px] text-stone-600">{periodLabel}</p>
        </div>
        <div className="relative inline-flex shrink-0 rounded-[10px] bg-primary-50 p-[3px] gap-0.5">
          <div className="absolute top-[3px] bottom-[3px] rounded-lg bg-white shadow-sm transition-all duration-300"
            style={{ left: `${periods.findIndex(p => p.value === period) * 25}%`, width: '25%' }} />
          {periods.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`relative z-10 px-[14px] py-1.5 text-[12.5px] font-medium rounded-lg transition-colors duration-200 ${
                period === p.value ? 'text-primary-700 font-semibold' : 'text-stone-600 hover:text-stone-800'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Rangée 1 — KPI : bande unique, segments séparés */}
        <div className="col-span-12 flex flex-col divide-y divide-warm overflow-hidden rounded-xl border border-warm bg-white shadow-sm sm:flex-row sm:divide-x sm:divide-y-0">
          {kpiCards.map((k) => (
            <div key={k.label} className="flex flex-1 items-center gap-3 px-4 py-2.5">
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] ${k.iconClass}`}>{k.icon}</div>
              <div>
                <div className="font-heading text-[19px] font-semibold leading-none text-stone-800">{k.value}</div>
                <div className="mt-0.5 text-[12px] text-stone-500">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Rangée 2 — rythme d'activité (lecture principale) + croissance fichier */}
        <div className="col-span-12 flex min-h-0 flex-col rounded-xl border border-warm bg-white p-4 shadow-sm lg:col-span-8">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-heading text-[15px] font-semibold text-stone-800">
              Consultations par {period === 'year' ? 'mois' : 'jour'}
            </h3>
            <div className="flex gap-3.5 text-[11.5px] text-stone-500">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[var(--chart-1)]" />Consultations</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[var(--chart-3)]" />Nouveaux patients</span>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[150px] w-full">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B9B2A4' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#B9B2A4' }} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="consultations" name="Consultations" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar dataKey="newPatients" name="Nouveaux patients" fill="var(--chart-3)" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ChartContainer>
          {peak && trough && (
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 border-t border-dashed border-warm pt-2 text-[12px] text-stone-500">
              <span>
                <span className="font-semibold text-emerald-600">↗ Pic :</span>{' '}
                <strong className="font-semibold text-stone-800">{formatNoteDate(peak.date)}</strong> — {peak.consultations} {peak.consultations > 1 ? 'consultations' : 'consultation'}
              </span>
              <span>
                <span className="font-semibold text-red-500">↘ Creux :</span>{' '}
                <strong className="font-semibold text-stone-800">{formatNoteDate(trough.date)}</strong> — {trough.consultations} {trough.consultations > 1 ? 'consultations' : 'consultation'}
              </span>
            </div>
          )}
        </div>

        <div className="col-span-12 flex flex-col rounded-xl border border-warm bg-white p-4 shadow-sm lg:col-span-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Total patients suivis</p>
          <p className="mt-1 font-heading text-[26px] font-semibold leading-none tracking-[-.01em] text-stone-800">{cumulativeTotal} patients</p>
          <ChartContainer config={{ patients: { label: 'Patients', color: 'var(--chart-1)' } }} className="mt-auto h-[64px] w-full">
            <AreaChart data={cumulativePatients} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B9B2A4' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#B9B2A4' }} width={28} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="cumulative" name="Patients" stroke="var(--chart-1)" strokeWidth={2.2} fill="url(#growthGrad)" />
            </AreaChart>
          </ChartContainer>
          {cumulativePatients.length > 1 && (
            <div className="mt-1 flex justify-between font-mono text-[9px] text-stone-500">
              <span>{cumulativePatients[0].date}</span>
              <span>{cumulativePatients[cumulativePatients.length - 1].date}</span>
            </div>
          )}
        </div>

        {/* Rangée 3 — présence (jauge) + motifs + âge */}
        <div className="col-span-12 flex flex-col rounded-xl border border-warm bg-white p-4 shadow-sm lg:col-span-4">
          <h3 className={cardTitleClass}>Présence aux rendez-vous</h3>
          {attendanceRate !== null ? (
            <div className="flex flex-1 items-center gap-4">
              <svg width="84" height="84" viewBox="0 0 92 92" role="img" aria-label={`${attendanceRate}% de présence`}>
                <circle cx="46" cy="46" r="38" fill="none" strokeWidth="10" className="stroke-stone-200" />
                <circle cx="46" cy="46" r="38" fill="none" strokeWidth="10"
                  strokeDasharray={`${(2 * Math.PI * 38 * attendanceRate) / 100} ${2 * Math.PI * 38}`}
                  transform="rotate(-90 46 46)" strokeLinecap="round" className="stroke-[var(--chart-1)]" />
                <text x="46" y="51" textAnchor="middle" className="fill-stone-800 font-heading text-[19px] font-semibold">{attendanceRate}%</text>
              </svg>
              <p className="max-w-[140px] text-[12.5px] text-stone-500">
                de patients présents sur la période ({totalBookings - cancelledBookings} / {totalBookings})
              </p>
            </div>
          ) : (
            <p className="text-[12.5px] text-stone-500">Aucun rendez-vous sur cette période.</p>
          )}
        </div>

        <div className="col-span-12 flex flex-col rounded-xl border border-warm bg-white p-4 shadow-sm lg:col-span-4">
          <h3 className={cardTitleClass}>Motifs de visite</h3>
          <div className="flex flex-1 items-center gap-4">
            <ResponsiveContainer width={92} height={92}>
              <PieChart>
                <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={46} innerRadius={30}>
                  {reasonData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex flex-1 flex-col gap-2 text-[13px] text-stone-800">
              {reasonData.map((r, i) => (
                <li key={r.name} className="flex items-center gap-2">
                  <i className="size-2 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="flex-1">{r.name}</span>
                  <b className="font-mono text-[12px] font-medium text-stone-600">{r.value}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-12 flex flex-col rounded-xl border border-warm bg-white p-4 shadow-sm lg:col-span-4">
          <h3 className={cardTitleClass}>Répartition par âge</h3>
          <div className="flex flex-1 flex-col justify-center gap-3">
            {ageData.map((a) => (
              <div key={a.range} className="grid grid-cols-[86px_1fr_22px] items-center gap-2.5 text-[13px]">
                <span className="text-stone-800">{a.range} ans</span>
                <span className="h-2 overflow-hidden rounded-full bg-stone-200">
                  <span className="block h-full rounded-full bg-primary-500 transition-all duration-700"
                    style={{ width: `${Math.round((a.count / maxAge) * 100)}%` }} />
                </span>
                <b className="text-end font-mono text-[12px] font-medium text-stone-600">{a.count}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Rangée 4 — arrivées (large) + provenance */}
        <div className="col-span-12 flex flex-col rounded-xl border border-warm bg-white p-4 shadow-sm lg:col-span-7">
          <h3 className={cardTitleClass}>Arrivées par heure</h3>
          <ChartContainer config={chartConfig} className="h-[105px] w-full">
            <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#B9B2A4' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#B9B2A4' }} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" name="Arrivées" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="col-span-12 flex flex-col rounded-xl border border-warm bg-white p-4 shadow-sm lg:col-span-5">
          <h3 className={cardTitleClass}>Provenance des patients</h3>
          {(sourceData || []).length === 0 ? (
            <p className="text-[12.5px] text-stone-500">Aucune donnée sur cette période.</p>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-3">
              {(sourceData || []).map((s, i) => (
                <div key={s.name} className="grid grid-cols-[86px_1fr_22px] items-center gap-2.5 text-[13px]">
                  <span className="truncate text-stone-800">{s.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <span className={`block h-full rounded-full transition-all duration-700 ${['bg-primary-500', 'bg-amber-500', 'bg-orange-500', 'bg-stone-400'][i % 4]}`}
                      style={{ width: `${Math.round((s.value / maxSource) * 100)}%` }} />
                  </span>
                  <b className="text-end font-mono text-[12px] font-medium text-stone-600">{s.value}</b>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
