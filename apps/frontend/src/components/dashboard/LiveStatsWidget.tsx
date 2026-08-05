import { getTenantId } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'
import { Link } from '@/i18n/navigation'
import { Users, Calendar, ClockArrowDown, CheckCheck } from 'lucide-react'

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

  const cards = [
    { label: 'Programmés', count: scheduled?.totalDocs ?? 0, icon: <Calendar className="size-4" />,
      topColor: 'border-t-[3px] border-t-primary-500 rounded-t-[4px]', iconBg: 'bg-primary/10 text-primary-600' },
    { label: 'Salle d\'attente', count: waiting?.totalDocs ?? 0, icon: <Users className="size-4" />,
      topColor: 'border-t-[3px] border-t-secondary-500 rounded-t-[4px]', iconBg: 'bg-warning/10 text-warning' },
    { label: 'En consultation', count: inConsultation?.totalDocs ?? 0, icon: <ClockArrowDown className="size-4" />,
      topColor: 'border-t-[3px] border-t-cta-500 rounded-t-[4px]', iconBg: 'bg-orange-50 text-orange-700', pulse: true },
    { label: 'Terminés aujourd\'hui', count: completed?.totalDocs ?? 0, icon: <CheckCheck className="size-4" />,
      topColor: 'border-t-[3px] border-t-primary-700 rounded-t-[4px]', iconBg: 'bg-primary/10 text-primary-700' },
  ]

  const inner = (card: typeof cards[0]) => (
    <div className={`rounded-xl border border-border ${card.topColor} bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md hover:-translate-y-1 ${clickable ? 'cursor-pointer' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12.5px] text-[#2A241C]-soft">{card.label}</span>
        <span className={`relative flex size-[33px] items-center justify-center rounded-lg ${card.iconBg}`}>
          {card.pulse && (
            <>
              <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-cta-500" />
              <span className="absolute -top-0.5 -end-0.5 size-2 animate-ping rounded-full bg-cta-500" />
            </>
          )}
          {card.icon}
        </span>
      </div>
      <p className="font-heading text-[28px] font-bold text-[#2A241C]">{card.count}</p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {cards.map((card) => clickable ? (
        <Link key={card.label} href="/dashboard/queue">{inner(card)}</Link>
      ) : inner(card))}
    </div>
  )
}
