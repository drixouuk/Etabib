import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { Link } from '@/i18n/navigation'
import { Users, Calendar, ClockArrowDown, CheckCheck } from 'lucide-react'

type StatCard = {
  label: string
  count: number
  icon: React.ReactNode
  borderClass: string
  iconBg: string
  iconColor: string
  pulse?: boolean
}

type Props = {
  clickable?: boolean
}

export default async function LiveStatsWidget({ clickable }: Props) {
  const user = await requireAuth()
  const tenantId = getTenantId(user)
  const baseWhere = `where[tenant][equals]=${tenantId}`

  const [scheduled, waiting, inConsultation, completed] = await Promise.all([
    fetchCMS<{ totalDocs: number }>(`/api/queue-items?${baseWhere}&where[status][equals]=scheduled&depth=0&limit=0`, { revalidate: 0 }),
    fetchCMS<{ totalDocs: number }>(`/api/queue-items?${baseWhere}&where[status][equals]=waiting&depth=0&limit=0`, { revalidate: 0 }),
    fetchCMS<{ totalDocs: number }>(`/api/queue-items?${baseWhere}&where[status][equals]=in_consultation&depth=0&limit=0`, { revalidate: 0 }),
    fetchCMS<{ totalDocs: number }>(`/api/queue-items?${baseWhere}&where[status][equals]=completed&depth=0&limit=0`, { revalidate: 0 }),
  ])

  const cards: StatCard[] = [
    { label: 'Programmés', count: scheduled?.totalDocs ?? 0, icon: <Calendar className="size-5" />, borderClass: 'border-t-primary-600', iconBg: 'bg-primary-50', iconColor: 'text-primary-600' },
    { label: 'Salle d\'attente', count: waiting?.totalDocs ?? 0, icon: <Users className="size-5" />, borderClass: 'border-t-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { label: 'En consultation', count: inConsultation?.totalDocs ?? 0, icon: <ClockArrowDown className="size-5" />, borderClass: 'border-t-orange-500', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', pulse: true },
    { label: 'Terminés aujourd\'hui', count: completed?.totalDocs ?? 0, icon: <CheckCheck className="size-5" />, borderClass: 'border-t-teal-700', iconBg: 'bg-primary-50', iconColor: 'text-primary-600' },
  ]

  const inner = (card: StatCard) => (
    <div
      key={card.label}
      className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md hover:-translate-y-0.5 border-t-4 ${card.borderClass} rounded-t-none ${
        clickable ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-500">{card.label}</span>
        <span className={`relative flex size-8 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}>
          {card.pulse && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-orange-500"><span className="absolute inset-0 animate-ping rounded-full bg-orange-500" /></span>}
          {card.icon}
        </span>
      </div>
      <p className="mt-2 font-heading text-3xl font-bold text-stone-800">{card.count}</p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) =>
        clickable ? (
          <Link key={card.label} href="/dashboard/queue">
            {inner(card)}
          </Link>
        ) : (
          inner(card)
        ),
      )}
    </div>
  )
}
