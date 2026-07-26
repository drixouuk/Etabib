'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react'

type ScheduleEntry = { id: string; vaccineName: string; doseLabel: string; ageMonths: number; order?: number | null; notes?: string | null }

type Vaccination = {
  id: string; vaccineName: string; doseLabel: string; dateAdministered?: string | null
  status?: 'administered' | 'contraindicated' | 'refused'
  lotNumber?: string; administrationRoute?: string
}

type Props = { patientId: string; schedule: ScheduleEntry[]; vaccinations: Vaccination[]; patientGender?: string | null; patientBirthDate?: string | null }

function computeAgeMonths(birthDate: string): number {
  const now = new Date(); const birth = new Date(birthDate)
  return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
}

function formatDate(iso: string) { return new Date(iso).toLocaleDateString('fr-FR') }

export default function VaccinationRecord({ patientId, schedule, vaccinations, patientGender, patientBirthDate }: Props) {
  const router = useRouter()
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [dateValue, setDateValue] = useState(new Date().toISOString().slice(0, 10))
  const [routeValue, setRouteValue] = useState('')
  const [lotValue, setLotValue] = useState('')
  const [saving, setSaving] = useState(false)

  if (!patientBirthDate) return (
    <div className="mb-8">
      <h3 className="mb-2 font-heading text-lg font-semibold text-ink">Carnet vaccinal</h3>
      <p className="text-sm text-ink-softer">Date de naissance manquante — impossible d&apos;évaluer le calendrier vaccinal.</p>
    </div>
  )

  const ageMonths = computeAgeMonths(patientBirthDate)
  const isBoy = patientGender === 'boy'

  const sorted = [...schedule]
    .filter((s) => !(s.notes?.includes('Filles uniquement') && isBoy))
    .sort((a, b) => (a.ageMonths ?? 0) - (b.ageMonths ?? 0) || (a.order ?? 0) - (b.order ?? 0))

  const vaccinationDone = (entry: ScheduleEntry): Vaccination | undefined =>
    vaccinations.find((v) => v.vaccineName === entry.vaccineName && v.doseLabel === entry.doseLabel && v.status !== 'contraindicated' && v.status !== 'refused')

  const vaccinationExcluded = (entry: ScheduleEntry): Vaccination | undefined =>
    vaccinations.find((v) => v.vaccineName === entry.vaccineName && v.doseLabel === entry.doseLabel && (v.status === 'contraindicated' || v.status === 'refused'))

  const quickStatus = async (entry: ScheduleEntry, status: string) => {
    const res = await fetch('/api/cms-proxy/vaccinations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient: patientId, vaccineName: entry.vaccineName, doseLabel: entry.doseLabel, status }),
    })
    if (res.ok) router.refresh()
  }

  const handleSubmit = async (entry: ScheduleEntry) => {
    setSaving(true)
    const body: Record<string, unknown> = {
      patient: patientId, vaccineName: entry.vaccineName, doseLabel: entry.doseLabel,
      dateAdministered: dateValue, status: 'administered',
      administrationRoute: routeValue || undefined, lotNumber: lotValue || undefined,
    }
    try {
      const res = await fetch('/api/cms-proxy/vaccinations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) { setActiveForm(null); router.refresh() }
    } catch { /* silent */ }
    setSaving(false)
  }

  if (sorted.length === 0) return (
    <div className="mb-8">
      <h3 className="mb-2 font-heading text-lg font-semibold text-ink">Carnet vaccinal</h3>
      <p className="text-sm text-ink-softer">Aucun vaccin dans le calendrier de référence.</p>
    </div>
  )

  return (
    <div className="mb-8">
      <h3 className="mb-3 font-heading text-lg font-semibold text-ink">Carnet vaccinal</h3>
      <p className="mb-3 text-xs text-ink-softer">Âge du patient : {Math.floor(ageMonths / 12)} ans {ageMonths % 12} mois</p>
      <div className="overflow-x-auto rounded-xl border border-warm bg-white shadow-warm-sm">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-warm bg-stone-50 text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-2.5 font-medium">Vaccin</th>
              <th className="px-4 py-2.5 font-medium">Dose</th>
              <th className="px-4 py-2.5 font-medium">Âge</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="px-4 py-2.5 font-medium hidden md:table-cell">Voie</th>
              <th className="px-4 py-2.5 font-medium hidden md:table-cell">Lot</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((entry, idx) => {
              const done = vaccinationDone(entry)
              const excluded = vaccinationExcluded(entry)
              const isFuture = entry.ageMonths > ageMonths
              const isOverdue = !done && !excluded && !isFuture
              const key = `${entry.vaccineName}-${entry.doseLabel}-${idx}`
              const showForm = activeForm === key

              let statusIcon: React.ReactNode; let statusText: string; let statusColor: string; let rowBg = ''

              if (excluded) {
                rowBg = 'bg-stone-50/50'
                if (excluded.status === 'contraindicated') {
                  statusIcon = <AlertCircle className="size-4 text-purple-500" />
                  statusText = 'Contre-indiqué'; statusColor = 'text-purple-600'
                } else {
                  statusIcon = <AlertCircle className="size-4 text-ink-softer" />
                  statusText = 'Refusé'; statusColor = 'text-ink-softer'
                }
              } else if (done) {
                rowBg = 'bg-green-50/30'
                statusIcon = <CheckCircle2 className="size-4 text-green-500" />
                statusText = done.dateAdministered ? `Administré le ${formatDate(done.dateAdministered)}` : 'Administré'
                statusColor = 'text-green-600'
              } else if (isFuture) {
                statusIcon = <Clock className="size-4 text-stone-300" />
                statusText = 'À venir'; statusColor = 'text-stone-300'
              } else {
                statusIcon = <AlertCircle className="size-4 text-red-500" />
                statusText = 'En retard'; statusColor = 'text-red-600'
              }

              return (
                <tr key={key} className={`hover:bg-stone-50 ${rowBg}`}>
                  <td className="px-4 py-2.5 font-medium text-ink">{entry.vaccineName}</td>
                  <td className="px-4 py-2.5 text-stone-600">{entry.doseLabel}{entry.notes && <span className="ml-1 text-xs text-ink-softer">({entry.notes})</span>}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{entry.ageMonths < 1 ? 'Naissance' : entry.ageMonths >= 12 ? `${Math.floor(entry.ageMonths / 12)} ans` : `${entry.ageMonths} mois`}</td>
                  <td className={`px-4 py-2.5 ${statusColor}`}><span className="flex items-center gap-1.5">{statusIcon}{statusText}</span></td>
                  <td className="px-4 py-2.5 text-ink-soft hidden md:table-cell">{done?.administrationRoute || '—'}</td>
                  <td className="px-4 py-2.5 text-ink-soft hidden md:table-cell text-xs font-mono">{done?.lotNumber || '—'}</td>
                  <td className="px-4 py-2.5">
                    {!done && !excluded && !showForm && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setActiveForm(key); setDateValue(new Date().toISOString().slice(0, 10)); setRouteValue(''); setLotValue('') }}
                          className="rounded bg-cta-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-cta-700">Administré</button>
                        <button onClick={() => quickStatus(entry, 'contraindicated')}
                          className="rounded border border-warm bg-white px-2 py-1 text-xs font-medium text-ink-soft hover:text-ink">Contre-indiqué</button>
                        <button onClick={() => quickStatus(entry, 'refused')}
                          className="rounded border border-warm bg-white px-2 py-1 text-xs font-medium text-ink-soft hover:text-ink">Refusé</button>
                      </div>
                    )}
                    {showForm && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)}
                          className="w-28 rounded border border-stone-300 px-2 py-1 text-xs focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
                        <select value={routeValue} onChange={e => setRouteValue(e.target.value)}
                          className="w-20 rounded border border-stone-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none">
                          <option value="">Voie</option><option value="IM">IM</option><option value="SC">SC</option><option value="oral">Orale</option><option value="intradermal">ID</option>
                        </select>
                        <input type="text" value={lotValue} onChange={e => setLotValue(e.target.value)} placeholder="Lot"
                          className="w-20 rounded border border-stone-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none" />
                        <button onClick={() => handleSubmit(entry)} disabled={saving}
                          className="rounded bg-cta-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50">{saving ? '…' : 'OK'}</button>
                        <button onClick={() => setActiveForm(null)} className="text-xs text-ink-softer hover:text-stone-600">✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
