import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { Link } from '@/i18n/navigation'
import { ArrowRight } from 'lucide-react'
import PatientAvatar from '@/components/dashboard/PatientAvatar'

type QueueItem = {
  id: string
  status: string
  visitReason: string
  arrivalTime: string | null
  patient: { id: string; fullName: string; gender?: string; birthDate?: string }
}

export default async function QueuePreview() {
  const user = await requireAuth()
  const tenantId = getTenantId(user)

  const data = await fetchCMS<{ docs: QueueItem[] }>(
    `/api/queue-items?where[tenant][equals]=${tenantId}&where[status][in]=waiting&where[status][in]=in_consultation&sort=arrivalTime&depth=1&limit=5`,
    { revalidate: 0 },
  )
  const items = data?.docs ?? []

  const statusLabels: Record<string, string> = { waiting: 'Salle d\'attente', in_consultation: 'En consultation' }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">En attente</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-400">Aucun patient en attente</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {items.map((item) => {
            const p = item.patient
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <PatientAvatar fullName={p?.fullName || '?'} gender={(p?.gender as 'boy' | 'girl' | null) || null} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/patients/${p?.id}`} className="text-sm font-medium text-stone-800 hover:text-primary-600 transition-colors duration-200">
                    {p?.fullName || '—'}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="inline-block rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700">{item.visitReason}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.arrivalTime && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      {new Date(item.arrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.status === 'in_consultation' ? 'bg-primary/10 text-primary-700' : 'bg-warning/10 text-warning'
                  }`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Link href="/dashboard/queue" className="flex items-center justify-center gap-1 border-t border-stone-100 px-4 py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200">
        Voir toute la file d'attente <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
