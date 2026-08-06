'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Clock, ArrowRight, Check } from 'lucide-react'
import PatientAvatar from '@/components/dashboard/PatientAvatar'

type Patient = {
  id: string
  fullName: string
  gender?: 'boy' | 'girl'
  birthDate?: string
}

type QueueItem = {
  id: string
  status: string
  visitReason: string
  arrivalTime: string | null
  patient: Patient
  doctor?: { id: string; name: string } | null
}

type Props = {
  tenantId?: string
  isClinique?: boolean
  currentDoctorId?: string
}

function computeAge(birthDate: string): string {
  const now = new Date()
  const birth = new Date(birthDate)
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()

  if (months < 1) return 'Nouveau-né'
  if (months < 24) return `${months} mois`
  const years = Math.floor(months / 12)
  return `${years} ans`
}

function visitReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    consultation: 'Consultation',
    controle: 'Contrôle',
    vaccin: 'Vaccin',
    urgence: 'Urgence',
  }
  return labels[reason] || reason
}

const transitionMap: Record<string, string> = {
  waiting: 'in_consultation',
  in_consultation: 'completed',
}

const actionLabels: Record<string, string> = {
  waiting: 'En consultation',
  in_consultation: 'Terminer',
}

const actionIcons: Record<string, React.ReactNode> = {
  waiting: <ArrowRight className="size-4" />,
  in_consultation: <Check className="size-4" />,
}

const statusLabels: Record<string, string> = {
  waiting: 'Salle d\'attente',
  in_consultation: 'En consultation',
}

export default function WaitingRoomList({ tenantId, isClinique, currentDoctorId }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(currentDoctorId)
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([])
  const [undoItem, setUndoItem] = useState<QueueItem | null>(null)
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchQueue = async () => {
    setLoading(true)
    let url = '/api/cms-proxy/queue-items?depth=2&sort=arrivalTime&where[status][in]=waiting&where[status][in]=in_consultation&limit=50'
    if (selectedDoctorId) {
      url += `&where[doctor][equals]=${selectedDoctorId}`
    }
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      setItems(json.docs ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isClinique || !tenantId) return
    fetch(`/api/cms-proxy/doctors?where[tenant][equals]=${tenantId}&depth=0&limit=50`)
      .then(r => r.json())
      .then(j => setDoctors(j.docs ?? []))
      .catch(() => {})
  }, [tenantId, isClinique])

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 15000)
    return () => clearInterval(interval)
  }, [selectedDoctorId])

  const updateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = transitionMap[currentStatus]
    if (!nextStatus) return

    const body: Record<string, string> = { status: nextStatus }
    if (nextStatus === 'waiting') {
      body.arrivalTime = new Date().toISOString()
    }

    const res = await fetch(`/api/cms-proxy/queue-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      if (nextStatus === 'completed') {
        const item = items.find(i => i.id === id)
        if (item) {
          setUndoItem(item)
          if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
          undoTimeoutRef.current = setTimeout(() => setUndoItem(null), 5000)
        }
      }
      router.refresh()
      fetchQueue()
    }
  }

  const undoComplete = async () => {
    if (!undoItem) return
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    await fetch(`/api/cms-proxy/queue-items/${undoItem.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_consultation' }),
    })
    setUndoItem(null)
    router.refresh()
    fetchQueue()
  }

  const activeItems = items.filter((i) => i.status === 'waiting' || i.status === 'in_consultation')

  return (
    <div className="min-h-full rounded-xl border border-warm bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">File d&apos;attente en direct</h2>
        <div className="flex items-center gap-2">
          {isClinique && doctors.length > 0 && (
            <select
              value={selectedDoctorId || ''}
              onChange={(e) => setSelectedDoctorId(e.target.value || undefined)}
              className="rounded-lg border border-warm bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tous les médecins</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <button onClick={fetchQueue} className="text-xs font-medium text-primary-600 hover:text-primary-700">
            Rafraîchir
          </button>
        </div>
      </div>

      {undoItem && (
        <div className="flex items-center justify-between bg-primary-50 px-4 py-2 text-sm">
          <span className="text-primary-700">{undoItem.patient?.fullName} — consultation terminée</span>
          <button onClick={undoComplete} className="font-medium text-primary-700 hover:text-primary-800 underline">
            Annuler
          </button>
        </div>
      )}
      {loading && items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-stone-500">Chargement…</div>
      ) : activeItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-stone-600">Aucun patient en attente.</div>
      ) : (
        <div className="divide-y divide-stone-100">
          {activeItems.map((item) => {
            const patient = item.patient
            const next = transitionMap[item.status]

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <PatientAvatar fullName={patient?.fullName || '?'} gender={patient?.gender ?? null} size="md" />

                <div className="min-w-0 flex-1">
                  {patient?.id ? (
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="truncate text-sm font-semibold text-stone-800 hover:text-primary-600 transition-colors duration-200"
                    >
                      {patient.fullName || '—'}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-semibold text-stone-800">{patient?.fullName || '—'}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-600">
                    {isClinique && item.doctor?.name && <span className="text-stone-600">Dr. {item.doctor.name}</span>}
                    {patient?.birthDate && <span>{computeAge(patient.birthDate)}</span>}
                    <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                      item.visitReason === 'controle' ? 'bg-info/10 text-info' :
                      item.visitReason === 'vaccin' ? 'bg-secondary/10 text-secondary-700' :
                      item.visitReason === 'urgence' ? 'bg-danger/10 text-danger' :
                      'bg-stone-100 text-stone-800'
                    }`}>
                      {visitReasonLabel(item.visitReason)}
                    </span>
                    {item.arrivalTime && (
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="size-3" />
                        {new Date(item.arrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block ${item.status === 'in_consultation' ? 'bg-primary/10 text-primary-700 border border-primary/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                  {statusLabels[item.status]}
                </span>

                {next && (
                  <button
                    onClick={() => updateStatus(item.id, item.status)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700"
                  >
                    {actionIcons[item.status]}
                    {actionLabels[item.status]}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
