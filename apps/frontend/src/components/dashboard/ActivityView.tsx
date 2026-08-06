'use client'


import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { UserPlus, Stethoscope, CheckCheck, TrendingUp, TrendingDown } from 'lucide-react'
import type { ActivityRanking } from '@/app/[locale]/(dashboard)/dashboard/activity/page'

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
  ranking: ActivityRanking
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
  period, newPatients, consultationsDone, completedToday, reasonData, hourlyData, sourceData, chartData, cumulativePatients, cumulativeTotal, ageData, attendanceRate, totalBookings, cancelledBookings, ranking,
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

  const rankTitles: Record<string, { top: string; bottom: string }> = {
    'month-day': { top: 'Jours du mois les plus actifs', bottom: 'Jours du mois les moins actifs' },
    weekday: { top: 'Jours de la semaine les plus actifs', bottom: 'Jours de la semaine les moins actifs' },
    month: { top: 'Mois les plus actifs', bottom: 'Mois les moins actifs' },
  }
  const rankTitle = ranking ? rankTitles[ranking.unit] : null

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-110px)]">
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

      {/* Rangée 1 — KPI */}
      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        {kpiCards.map((k) => (
          <div key={k.label} className={`rounded-xl border border-warm border-t-[3px] rounded-t-[4px] bg-white px-3.5 py-3 shadow-sm ${k.topClass}`}>
            <div className="flex items-center gap-2">
              <div className={`flex size-[26px] items-center justify-center rounded-lg ${k.iconClass}`}>{k.icon}</div>
              <span className="text-[20px] font-bold text-stone-800">{k.value}</span>
              {trendFor(period, k.value) && (
                <span className="text-[10.5px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{trendFor(period, k.value)}</span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-stone-600">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Rangée 2 — chart activité + cumulé + motifs */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={`${cardClass} h-full`}>
          <h3 className={cardTitleClass}>Consultations par {period === 'year' ? 'mois' : 'jour'}</h3>
          <ChartContainer config={chartConfig} className="h-[120px] w-full">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#B9B2A4' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#B9B2A4' }} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="consultations" name="Consultations" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={10} />
              <Bar dataKey="newPatients" name="Nouveaux patients" fill="var(--chart-3)" radius={[4, 4, 0, 0]} barSize={10} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className={`${cardClass} h-full`}>
          <div className="flex items-baseline justify-between">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-stone-600">Total patients suivis</p>
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-primary-700">cumulé</span>
          </div>
          <p className="text-[15px] font-bold text-stone-800">{cumulativeTotal} patients</p>
          <ChartContainer config={{ patients: { label: 'Patients', color: 'var(--chart-1)' } }} className="mt-1 h-[92px] w-full">
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
        </div>

        <div className={`${cardClass} h-full`}>
          <h3 className={cardTitleClass}>Motifs de visite</h3>
          <div className="flex items-center gap-5">
            <ResponsiveContainer width={92} height={92}>
              <PieChart>
                <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} innerRadius={26}>
                  {reasonData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 text-[12px] text-stone-800">
              {reasonData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-1.5">
                  <i className="size-2 rounded-sm shrink-0 inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {r.name} <b className="text-stone-600 font-medium ms-0.5">{r.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rangée 3 — âge + arrivées + présence */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={`${cardClass} h-full`}>
          <h3 className={cardTitleClass}>Répartition par âge</h3>
          <div className="flex flex-col gap-2">
            {ageData.map((a) => (
              <div key={a.range} className="flex items-center gap-2.5">
                <span className="w-[62px] shrink-0 text-[12px] text-stone-800">{a.range} ans</span>
                <div className="h-2 flex-1 rounded-md bg-stone-200 overflow-hidden">
                  <div className="h-full rounded-md bg-primary-500 transition-all duration-700"
                    style={{ width: `${Math.round((a.count / maxAge) * 100)}%` }} />
                </div>
                <span className="w-[26px] text-end text-[12px] font-semibold text-stone-800">{a.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardClass} h-full`}>
          <h3 className={cardTitleClass}>Arrivées par heure</h3>
          <ChartContainer config={chartConfig} className="h-[96px] w-full">
            <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#B9B2A4' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#B9B2A4' }} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" name="Arrivées" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className={`${cardClass} h-full`}>
          <h3 className={cardTitleClass}>Présence aux rendez-vous</h3>
          <p className="text-[26px] font-bold text-stone-800">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</p>
          <p className="text-[12px] text-stone-600">{totalBookings > 0 ? `${totalBookings - cancelledBookings} présents / ${totalBookings} rendez-vous` : 'Aucun rendez-vous sur cette période'}</p>
        </div>
      </div>

      {/* Rangée 4 — classement + provenance */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {rankTitle && ranking && (
          <div className={`${cardClass} h-full`}>
            <h3 className={cardTitleClass}>
              <TrendingUp className="me-1.5 inline size-3.5 text-emerald-600" />
              {rankTitle.top}
            </h3>
            <div className="flex flex-col gap-1.5">
              {ranking.top.map((d, i) => (
                <div key={d.label} className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-700">{i + 1}</span>
                  <span className="flex-1 truncate text-[12.5px] text-stone-800">{d.label}</span>
                  <span className="text-[12.5px] font-semibold text-stone-800">{d.count} cons.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rankTitle && ranking && (
          <div className={`${cardClass} h-full`}>
            <h3 className={cardTitleClass}>
              <TrendingDown className="me-1.5 inline size-3.5 text-red-500" />
              {rankTitle.bottom}
            </h3>
            <div className="flex flex-col gap-1.5">
              {ranking.bottom.map((d, i) => (
                <div key={d.label} className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-bold text-stone-600">{i + 1}</span>
                  <span className="flex-1 truncate text-[12.5px] text-stone-800">{d.label}</span>
                  <span className="text-[12.5px] font-semibold text-stone-800">{d.count} cons.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`${cardClass} h-full`}>
          <h3 className={cardTitleClass}>Provenance des patients</h3>
          {(sourceData || []).length === 0 ? (
            <p className="text-[12.5px] text-stone-500">Aucune donnée sur cette période.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(sourceData || []).map((s, i) => (
                <div key={s.name} className="flex items-center gap-2.5">
                  <span className="w-[110px] shrink-0 truncate text-[12px] text-stone-800">{s.name}</span>
                  <div className="h-2 flex-1 rounded-md bg-stone-200 overflow-hidden">
                    <div className={`h-full rounded-md transition-all duration-700 ${['bg-primary-500', 'bg-amber-500', 'bg-orange-500', 'bg-stone-400'][i % 4]}`}
                      style={{ width: `${Math.round((s.value / maxSource) * 100)}%` }} />
                  </div>
                  <span className="w-[26px] text-end text-[12px] font-semibold text-stone-800">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
