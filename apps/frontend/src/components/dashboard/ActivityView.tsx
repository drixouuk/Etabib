'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
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
}

const PRIMARY = 'var(--chart-1)'
const SECONDARY = 'var(--chart-3)'
const LIGHT_GRID = '#E7E5E4'
const LIGHT_TEXT = '#A8A29E'
const PIE_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
const SOURCE_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-2)', 'var(--chart-5)', '#84CC16', '#64748B', '#EC4899']

export default function ActivityView({
  period, newPatients, consultationsDone, completedToday, reasonData, hourlyData, sourceData, chartData,
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

  const hasData = chartData.some((d) => d.consultations > 0 || d.newPatients > 0) || completedToday > 0

  const chartConfig = {
    consultations: { label: 'Consultations', color: 'var(--chart-1)' },
    newPatients: { label: 'Nouveaux patients', color: 'var(--chart-3)' },
  }

  return (
    <div>
      <div className="mb-6 inline-flex rounded-lg bg-stone-100 p-0.5">
        {periods.map((p) => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              period === p.value ? 'bg-primary-100 text-primary-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><UserPlus className="size-5" /></span>
            <div>
              <p className="font-heading text-3xl font-bold text-stone-800">{newPatients}</p>
              <p className="text-sm text-stone-500">Nouveaux patients</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><Stethoscope className="size-5" /></span>
            <div>
              <p className="font-heading text-3xl font-bold text-stone-800">{consultationsDone}</p>
              <p className="text-sm text-stone-500">Consultations réalisées</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><CheckCheck className="size-5" /></span>
            <div>
              <p className="font-heading text-3xl font-bold text-stone-800">{completedToday}</p>
              <p className="text-sm text-stone-500">Patients vus</p>
            </div>
          </div>
        </div>
      </div>

      {!hasData && <p className="text-sm text-stone-400">Aucune donnée pour cette période</p>}

      {hasData && (
        <div className="mb-6">
          <h3 className="mb-2 font-heading text-sm font-semibold text-stone-700">Consultations par jour</h3>
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
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
          </div>
        </div>
      )}

      {reasonData.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-heading text-sm font-semibold text-stone-700">Motifs de visite</h3>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                    {reasonData.map((_entry, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-heading text-sm font-semibold text-stone-700">Arrivées par heure</h3>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LIGHT_GRID} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: LIGHT_TEXT }} />
                  <YAxis tick={{ fontSize: 10, fill: LIGHT_TEXT }} width={28} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Arrivées" fill="var(--color-consultations)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}

      {sourceData && sourceData.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 font-heading text-sm font-semibold text-stone-700">Provenance des patients</h3>
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }: any) => `${name}: ${value}`} labelLine={false}>
                  {sourceData.map((_entry: any, i: number) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
