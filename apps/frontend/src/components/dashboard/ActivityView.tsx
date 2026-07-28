'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
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

export default function ActivityView({
  period, newPatients, consultationsDone, completedToday, reasonData, hourlyData, sourceData, chartData, cumulativePatients, cumulativeTotal, ageData,
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5 mb-6">
        <div>
          <h1 className="text-[27px] font-bold tracking-tight text-[#2A241C]">Activité</h1>
          <p className="mt-1 text-[13.5px] text-[#2A241C]-soft">
            {period === 'year' ? 'Année 2026' : period === 'month' ? 'Juillet 2026' : period === 'week' ? 'Semaine du 21/07' : new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="relative inline-flex shrink-0 rounded-[10px] bg-primary-50 p-[3px] gap-0.5">
          <div className="absolute top-[3px] bottom-[3px] rounded-lg bg-white shadow-sm transition-all duration-300"
            style={{ left: `${periods.findIndex(p => p.value === period) * 25}%`, width: '25%' }} />
          {periods.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`relative z-10 px-[14px] py-2 text-[12.5px] font-medium rounded-lg transition-colors duration-200 ${
                period === p.value ? 'text-primary-700 font-semibold' : 'text-[#2A241C]-soft hover:text-[#2A241C]'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
        <div className="rounded-xl border border-warm border-t-[3px] border-t-primary-500 rounded-t-[4px] bg-white p-[17px_19px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex size-[33px] items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-[11px]">
            <UserPlus className="size-4" />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[28px] font-bold text-[#2A241C]">{newPatients}</span>
            {trendFor(period, newPatients) && (
              <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{trendFor(period, newPatients)}</span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-[#2A241C]-soft">Nouveaux patients</p>
        </div>
        <div className="rounded-xl border border-warm border-t-[3px] border-t-secondary-500 rounded-t-[4px] bg-white p-[17px_19px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex size-[33px] items-center justify-center rounded-lg bg-amber-50 text-amber-700 mb-[11px]">
            <Stethoscope className="size-4" />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[28px] font-bold text-[#2A241C]">{consultationsDone}</span>
            {trendFor(period, consultationsDone) && (
              <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{trendFor(period, consultationsDone)}</span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-[#2A241C]-soft">Consultations réalisées</p>
        </div>
        <div className="rounded-xl border border-warm border-t-[3px] border-t-primary-700 rounded-t-[4px] bg-white p-[17px_19px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex size-[33px] items-center justify-center rounded-lg bg-primary-50 text-primary-700 mb-[11px]">
            <CheckCheck className="size-4" />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[28px] font-bold text-[#2A241C]">{completedToday}</span>
            {trendFor(period, completedToday) && (
              <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{trendFor(period, completedToday)}</span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-[#2A241C]-soft">Patients vus</p>
        </div>
      </div>

      <p className="mt-7 mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#2A241C]-soft">Croissance du cabinet</p>
      <div className="rounded-xl border border-warm bg-white p-5 shadow-sm mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <div>
            <p className="text-[11.5px] uppercase tracking-wider text-[#2A241C]-soft font-semibold">Total patients suivis</p>
            <p className="text-xl font-bold text-[#2A241C]">{cumulativeTotal} patients</p>
          </div>
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-primary-700">cumulé</span>
        </div>
        <ChartContainer config={{ patients: { label: 'Patients', color: 'var(--chart-1)' } }} className="h-[150px] w-full">
          <AreaChart data={cumulativePatients} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B9B2A4' }} />
            <YAxis tick={{ fontSize: 11, fill: '#B9B2A4' }} width={32} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="cumulative" name="Patients" stroke="var(--chart-1)" strokeWidth={2.6} fill="url(#growthGrad)" dot={{ r: 0 }} activeDot={{ r: 4.5, fill: 'var(--chart-1)' }} />
          </AreaChart>
        </ChartContainer>
        <div className="flex justify-between text-[11px] text-[#2A241C]-soft">
          <span>{cumulativePatients[0]?.date || ''}</span>
          <span>{cumulativePatients[cumulativePatients.length - 1]?.date || ''}</span>
        </div>
      </div>

      {sourceData && sourceData.length > 0 && (
        <div className="rounded-xl border border-warm bg-white p-5 shadow-sm mb-4">
          <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">Provenance des patients</h3>
          <div className="flex flex-col gap-3.5">
            {sourceData.map((s, i) => {
              const maxVal = Math.max(...sourceData.map(d => d.value), 1)
              const colors = ['bg-primary-500', 'bg-amber-500', 'bg-orange-500', 'bg-stone-800-soft', 'bg-teal-400', 'bg-lime-500', 'bg-slate-500', 'bg-pink-500']
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="w-[130px] shrink-0 text-[12.5px] text-[#2A241C]">{s.name}</span>
                  <div className="flex-1 h-2.5 rounded-md bg-stone-200 overflow-hidden">
                    <div className={`h-full rounded-md transition-all duration-700 ${colors[i % colors.length]}`}
                      style={{ width: `${Math.round((s.value / maxVal) * 100)}%` }} />
                  </div>
                  <span className="w-[30px] text-right text-[12.5px] font-semibold text-[#2A241C]">{s.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-7 mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#2A241C]-soft">Activité clinique</p>

      <div className="rounded-xl border border-warm bg-white p-5 shadow-sm mb-4">
        <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">Consultations par {period === 'year' ? 'mois' : 'jour'}</h3>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B9B2A4' }} />
            <YAxis tick={{ fontSize: 11, fill: '#B9B2A4' }} width={30} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#8A8175' }} />
            <Bar dataKey="consultations" name="Consultations" fill="var(--chart-1)" radius={[5,5,0,0]} barSize={14} />
            <Bar dataKey="newPatients" name="Nouveaux patients" fill="var(--chart-3)" radius={[5,5,0,0]} barSize={14} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-warm bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">Motifs de visite</h3>
          <div className="flex items-center gap-8 flex-wrap">
            <ResponsiveContainer width={132} height={132}>
              <PieChart>
                <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} innerRadius={38}>
                  {reasonData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2.5 text-[12.5px] text-[#2A241C]">
              {reasonData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2">
                  <i className="size-2.5 rounded-sm shrink-0 inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {r.name} <b className="text-[#2A241C]-soft font-medium ml-1">{r.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {ageData && ageData.length > 0 && (
          <div className="rounded-xl border border-warm bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">Répartition par âge</h3>
            <div className="flex flex-col gap-3.5">
              {ageData.map((a) => {
                const maxCount = Math.max(...ageData.map(d => d.count), 1)
                return (
                  <div key={a.range} className="flex items-center gap-3">
                    <span className="w-[80px] shrink-0 text-[12.5px] text-[#2A241C]">{a.range} ans</span>
                    <div className="flex-1 h-2.5 rounded-md bg-stone-200 overflow-hidden">
                      <div className="h-full rounded-md bg-primary-500 transition-all duration-700"
                        style={{ width: `${Math.round((a.count / maxCount) * 100)}%` }} />
                    </div>
                    <span className="w-[30px] text-right text-[12.5px] font-semibold text-[#2A241C]">{a.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-7 mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#2A241C]-soft">Fonctionnement</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-warm bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">Arrivées par heure</h3>
          <ChartContainer config={chartConfig} className="h-[160px] w-full">
            <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#B9B2A4' }} />
              <YAxis tick={{ fontSize: 11, fill: '#B9B2A4' }} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" name="Arrivées" fill="var(--chart-1)" radius={[5,5,0,0]} barSize={14} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="rounded-xl border border-warm bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-[#2A241C]">Présence aux rendez-vous</h3>
          <p className="text-[34px] font-bold text-[#2A241C]">—</p>
          <p className="text-[12.5px] text-[#2A241C]-soft">Statistiques en cours de collecte</p>
        </div>
      </div>
    </div>
  )
}
