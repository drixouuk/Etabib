import { getTenantId } from '@/lib/tenant'
import { requireTier, isSecretaryOnly } from '@/lib/tier-guard'
import { redirect } from 'next/navigation'
import { fetchCMS } from '@/lib/cms-fetch'
import ActivityView from '@/components/dashboard/ActivityView'

type Props = {
  searchParams: Promise<{ period?: string }>
}

function getStartDate(period: string): Date {
  const now = new Date()
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1)
  }
  // week: start from Monday
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatISO(d: Date): string {
  return d.toISOString()
}

function formatKey(d: Date, period: Period): string {
  if (period === 'year') return `${d.getMonth() + 1}/${d.getFullYear()}`
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function groupByPeriod<T extends Record<string, unknown>>(
  items: T[],
  dateField: keyof T,
  period: Period,
): { date: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const raw = item[dateField]
    const d = new Date(raw as string)
    const key = formatKey(d, period)
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => {
      const [da, ma, ya = 0] = a.date.split('/').map(Number)
      const [db, mb, yb = 0] = b.date.split('/').map(Number)
      return (ya || new Date().getFullYear()) * 12 + ma - ((yb || new Date().getFullYear()) * 12 + mb) || da - db
    })
}

type Period = 'day' | 'week' | 'month' | 'year'

function visitReasonLabel(reason: string): string {
  const labels: Record<string, string> = { consultation: 'Consultation', controle: 'Contrôle', vaccin: 'Vaccin', urgence: 'Urgence' }
  return labels[reason] || reason
}

function mergeChartData(
  consultations: { date: string; count: number }[],
  patients: { date: string; count: number }[],
): { date: string; consultations: number; newPatients: number }[] {
  const map = new Map<string, { consultations: number; newPatients: number }>()
  for (const c of consultations) {
    const entry = map.get(c.date) || { consultations: 0, newPatients: 0 }
    entry.consultations = c.count
    map.set(c.date, entry)
  }
  for (const p of patients) {
    const entry = map.get(p.date) || { consultations: 0, newPatients: 0 }
    entry.newPatients = p.count
    map.set(p.date, entry)
  }
  return Array.from(map.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => {
      const [da, ma] = a.date.split('/').map(Number)
      const [db, mb] = b.date.split('/').map(Number)
      return da + ma * 31 - (db + mb * 31)
    })
}

// Complète la période avec tous ses jours/mois (y compris à zéro) : le chart
// et le classement « jours/mois les moins actifs » doivent voir les jours
// sans activité, pas seulement ceux qui ont une ligne en base.
function fillChartData(
  data: { date: string; consultations: number; newPatients: number }[],
  period: Period,
  startDate: Date,
): { date: string; consultations: number; newPatients: number }[] {
  const keys = new Set(data.map((d) => d.date))
  const filled: { date: string; consultations: number; newPatients: number }[] = [...data]
  const cursor = new Date(startDate)

  if (period === 'year') {
    for (let m = 0; m < 12; m++) {
      const key = `${m + 1}/${cursor.getFullYear()}`
      if (!keys.has(key)) filled.push({ date: key, consultations: 0, newPatients: 0 })
      cursor.setMonth(m + 1)
    }
  } else {
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const total = period === 'week' ? 7 : period === 'day' ? 1 : daysInMonth
    for (let d = 0; d < total; d++) {
      const key = `${cursor.getDate()}/${cursor.getMonth() + 1}`
      if (!keys.has(key)) filled.push({ date: key, consultations: 0, newPatients: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return filled.sort((a, b) => {
    const [da, ma] = a.date.split('/').map(Number)
    const [db, mb] = b.date.split('/').map(Number)
    return da + ma * 31 - (db + mb * 31)
  })
}

export default async function ActivityPage({ searchParams }: Props) {
  const { period: periodParam } = await searchParams
  const period: Period = (['day', 'week', 'month', 'year'] as const).includes(periodParam as any) ? (periodParam as Period) : 'week'
  const { user } = await requireTier(['cabinet'])
  if (isSecretaryOnly(user)) redirect('/dashboard/rendez-vous')
  const tenantId = getTenantId(user)
  const startDate = getStartDate(period)
  const isoStart = formatISO(startDate)

  const [patientsData, consultationsData, queueData, bookingsData] = await Promise.all([
    fetchCMS<{ docs: { id: string; createdAt: string }[] }>(
      `/api/patients?where[tenant][equals]=${tenantId}&where[createdAt][greater_than_equal]=${isoStart}&limit=5000&depth=0`,
    ),
    fetchCMS<{ docs: { id: string; date: string }[] }>(
      `/api/consultations?where[tenant][equals]=${tenantId}&where[date][greater_than_equal]=${isoStart}&limit=5000&depth=0`,
    ),
    fetchCMS<{ docs: { id: string; visitReason: string; arrivalTime: string; status: string }[] }>(
      `/api/queue-items?where[tenant][equals]=${tenantId}&where[arrivalTime][greater_than_equal]=${isoStart}&depth=0&limit=5000`,
    ),
    fetchCMS<{ docs: { id: string; status: string }[] }>(
      `/api/calbookings?where[tenant][equals]=${tenantId}&where[startTime][greater_than_equal]=${isoStart}&depth=0&limit=5000`,
    ),
  ])

  const patients = patientsData?.docs ?? []
  const consultations = consultationsData?.docs ?? []
  const queueItems = queueData?.docs ?? []
  const bookings = bookingsData?.docs ?? []

  const consultationsByDay = groupByPeriod(consultations, 'date', period)
  const patientsByDay = groupByPeriod(patients, 'createdAt', period)
  const chartData = fillChartData(mergeChartData(consultationsByDay, patientsByDay), period, startDate)

  const cumulativePatients = patientsByDay.reduce((acc, day, i) => {
    const prev = i > 0 ? acc[i - 1].cumulative : 0
    return [...acc, { ...day, cumulative: prev + day.count }]
  }, [] as { date: string; count: number; cumulative: number }[])

  const cumulativeTotal = cumulativePatients.length > 0
    ? cumulativePatients[cumulativePatients.length - 1].cumulative
    : 0

  const allPatientsRes = await fetchCMS<{ docs: { birthDate?: string }[] }>(
    `/api/patients?where[tenant][equals]=${tenantId}&depth=0&limit=5000`,
    { revalidate: 60 },
  )
  const ageGroups = { '0-1': 0, '1-3': 0, '3-6': 0, '6+': 0 } as Record<string, number>
  for (const p of (allPatientsRes?.docs ?? [])) {
    if (!p.birthDate) continue
    const ageY = (Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    if (ageY < 1) ageGroups['0-1']++
    else if (ageY < 3) ageGroups['1-3']++
    else if (ageY < 6) ageGroups['3-6']++
    else ageGroups['6+']++
  }
  const ageData = Object.entries(ageGroups).map(([range, count]) => ({ range, count }))

  const completedToday = queueItems.filter(i => i.status === 'completed').length

  const sourceCounts: Record<string, number> = {}
  for (const p of patients) {
    const src = (p as any).patientSource
    if (src) sourceCounts[src] = (sourceCounts[src] || 0) + 1
  }
  const sourceLabels: Record<string, string> = {
    referring_practitioner: 'Médecin réf.', google: 'Google', facebook: 'Facebook', instagram: 'Instagram',
    autre_patient: 'Patient', connaissance: 'Bouche-à-oreille', professionnel_sante: 'Pro. santé', autre: 'Autre',
  }
  const sourceData = Object.entries(sourceCounts)
    .map(([key, count]) => ({ name: sourceLabels[key] || key, value: count }))
    .filter(d => d.value > 0)

  const reasonCounts: Record<string, number> = { consultation: 0, controle: 0, vaccin: 0, urgence: 0 }
  for (const item of queueItems) {
    if (reasonCounts[item.visitReason] !== undefined) reasonCounts[item.visitReason]++
  }
  const reasonData = Object.entries(reasonCounts)
    .filter(([_, count]) => count > 0)
    .map(([reason, count]) => ({ name: visitReasonLabel(reason), value: count }))

  const hourlyCounts: Record<number, number> = {}
  for (let h = 8; h <= 18; h++) hourlyCounts[h] = 0
  for (const item of queueItems) {
    const hour = new Date(item.arrivalTime).getHours()
    if (hour >= 8 && hour <= 18) hourlyCounts[hour]++
  }
  const hourlyData = Object.entries(hourlyCounts).map(([hour, count]) => ({ hour: `${hour}h`, count }))

  const totalBookings = bookings.length
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
  const attendanceRate = totalBookings > 0 ? Math.round(((totalBookings - cancelledBookings) / totalBookings) * 100) : null

  return (
    <div className="mx-auto max-w-container px-4 py-8 md:px-6 lg:px-8">
      <ActivityView
        period={period}
        newPatients={patients.length}
        consultationsDone={consultations.length}
        completedToday={completedToday}
        reasonData={reasonData}
        hourlyData={hourlyData}
        sourceData={sourceData}
        chartData={chartData}
        cumulativePatients={cumulativePatients}
        cumulativeTotal={cumulativeTotal}
        ageData={ageData}
        attendanceRate={attendanceRate}
        totalBookings={totalBookings}
        cancelledBookings={cancelledBookings}
      />
    </div>
  )
}
