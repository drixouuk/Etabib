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
  )
  const items = data?.docs ?? []

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Aucun patient en attente</p>
      ) : (
        <div className="divide-y divide-warm">
          {items.map((item) => {
            const p = item.patient
            return (
              <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <PatientAvatar fullName={p?.fullName || '?'} gender={(p?.gender as 'boy' | 'girl' | null) || null} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/patients/${p?.id}`} className="text-sm font-medium text-stone-800 hover:text-primary-600 transition-colors duration-200">
                    {p?.fullName || '—'}
                  </Link>
                  <div className="text-xs text-stone-600">
                    <span className="inline-block rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-800">{item.visitReason}</span>
                  </div>
                </div>
                {item.arrivalTime && (
                  <span className="ms-auto shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {new Date(item.arrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {items.length > 0 && (
        <Link href="/dashboard/queue" className="mt-2 block text-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200">
          Voir toute la file d'attente <ArrowRight className="inline size-3.5" />
        </Link>
      )}
    </div>
  )
}
