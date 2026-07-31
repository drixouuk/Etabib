'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { Link } from '@/i18n/navigation'
import type { PayloadUser } from '@/lib/auth'
import type { Tenant } from '@/lib/payload'
type Props = {
  user: PayloadUser
  tenant: Tenant | null
  billingStatus?: string | null
  children: React.ReactNode
}

export default function DashboardShell({ user, tenant, billingStatus, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="flex min-h-screen bg-cream-100">
      <aside className="hidden md:flex w-[252px] shrink-0 flex-col border-r border-primary-600/15 bg-cream-50">
        <Sidebar user={user} tenant={tenant} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-primary-600/15 bg-cream-50 shadow-xl transition-transform duration-300 translate-x-0">
            <div className="flex items-center justify-end px-3 pt-3">
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-800" aria-label="Fermer le menu">
                <X className="size-5" />
              </button>
            </div>
            <Sidebar user={user} tenant={tenant} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {billingStatus === 'past_due' && (
          <div className="border-b border-warning/25 bg-warning/10 px-4 py-2 text-center text-xs font-medium text-stone-800">
            Paiement en retard —{' '}
            <Link href="/dashboard/billing" className="font-semibold underline underline-offset-2">régularisez votre abonnement</Link>{' '}
            avant la fin du délai de 14 jours.
          </div>
        )}
        {billingStatus === 'grace' && (
          <div className="border-b border-error/25 bg-error/10 px-4 py-2 text-center text-xs font-medium text-stone-800">
            Paiement en retard : espace en <strong>lecture seule</strong> —{' '}
            <Link href="/dashboard/billing" className="font-semibold underline underline-offset-2">régularisez pour retrouver toutes les fonctionnalités</Link>.
          </div>
        )}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-warm bg-white px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100" aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </button>
          <span className="truncate font-heading text-sm font-semibold text-stone-800">{tenant?.name || 'Cabinet'}</span>
        </div>
        <main className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
