import { LayoutDashboard, Users, ListOrdered, BarChart3, Calendar, Settings, FileText, ShieldAlert, LogOut } from 'lucide-react'
import { useState } from 'react'
import SidebarNav from './SidebarNav'
import QueueBar from './QueueBar'
import DemoSimulator from './DemoSimulator'
import type { PayloadUser } from '@/lib/auth'
import type { Tenant } from '@/lib/payload'

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  disabled?: boolean
}

type Props = {
  user: PayloadUser
  tenant?: Tenant | null
  onNavigate?: () => void
}

export default function Sidebar({ user, tenant, onNavigate }: Props) {
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const roleLabels: Record<string, string> = {
    superadmin: 'Super Admin',
    tenant_admin: 'Admin',
    doctor: 'Médecin',
    secretary: 'Secrétaire',
  }
  const tierLabels: Record<string, string> = {
    vitrine: 'Site vitrine',
    rdv: 'RDV en ligne',
    cabinet: 'Cabinet',
  }
  const tier = tenant?.settings?.activeTier
  const isDemo = tenant?.domain?.startsWith('drdemo.')

  const [simulatedTier, setSimulatedTierState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('demo-tier') || null
  })
  const [simulatedRole, setSimulatedRoleState] = useState<'doctor' | 'secretary'>(() => {
    if (typeof window === 'undefined') return 'doctor'
    return (sessionStorage.getItem('demo-role') as 'doctor' | 'secretary') || 'doctor'
  })

  const setSimulatedTier = (t: string | null) => {
    setSimulatedTierState(t)
    if (t) sessionStorage.setItem('demo-tier', t)
    else sessionStorage.removeItem('demo-tier')
  }
  const setSimulatedRole = (r: 'doctor' | 'secretary') => {
    setSimulatedRoleState(r)
    sessionStorage.setItem('demo-role', r)
  }

  // Le simulateur ne fait que FILTRER les items de sidebar — les guards serveur restent la source de vérité
  const effectiveTier = simulatedTier && simulatedTier !== 'cabinet' ? simulatedTier : tier
  const effectiveRoles = simulatedRole === 'secretary' ? ['secretary'] : user.roles

  const tierNav: Record<string, NavItem[]> = {
    vitrine: [
      { label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
    ],
    rdv: [
      { label: 'Rendez-vous', href: '/dashboard/rendez-vous', icon: <Calendar className="size-4" /> },
      { label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
    ],
    cabinet: [
      { label: 'Vue d\'ensemble', href: '/dashboard', icon: <LayoutDashboard className="size-4" /> },
      { label: 'Patients', href: '/dashboard/patients', icon: <Users className="size-4" /> },
      { label: 'File d\'attente', href: '/dashboard/queue', icon: <ListOrdered className="size-4" /> },
      { label: 'Activité', href: '/dashboard/activity', icon: <BarChart3 className="size-4" /> },
      { label: 'Rendez-vous', href: '/dashboard/rendez-vous', icon: <Calendar className="size-4" /> },
      { label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
    ],
  }

  const navItems = tierNav[effectiveTier || 'vitrine'] || tierNav.vitrine

  const adminItems: NavItem[] = []

  if (effectiveTier === 'cabinet') {
    adminItems.push({ label: "Registre d'audit", href: '/dashboard/audit-logs', icon: <FileText className="size-4" /> })
    if (user.roles?.includes('superadmin')) {
      adminItems.push({ label: 'Alertes système', href: '/dashboard/system-alerts', icon: <ShieldAlert className="size-4" /> })
    }
  }

  return (
    <div className="flex flex-col h-full px-[14px] py-[22px]">
      <div className="flex items-center gap-[10px] px-[10px] pb-[22px]">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h4l2 6 4-12 2 6h4"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-stone-800">{tenant?.name || 'Cabinet'}</p>
          <p className="text-[11.5px] text-stone-600">{tierLabels[tenant?.settings?.activeTier || ''] || ''}</p>
        </div>
      </div>

      <SidebarNav items={navItems} adminItems={adminItems} onNavigate={onNavigate} />

      {effectiveTier === 'cabinet' && effectiveRoles.includes('doctor') && (
        <QueueBar />
      )}

      {isDemo && (
        <DemoSimulator
          currentTier={simulatedTier || tier || 'vitrine'}
          onTierChange={setSimulatedTier}
          onRoleToggle={() => setSimulatedRole(simulatedRole === 'doctor' ? 'secretary' : 'doctor')}
          simulatedRole={simulatedRole}
        />
      )}

      <div className="border-t border-primary-600/15 px-[10px] pt-4 mt-auto">
        <div className="flex items-center gap-[10px]">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-[13.5px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-stone-800">{user.name || user.email}</p>
            <p className="text-[11px] text-stone-600">{effectiveRoles?.map((r) => roleLabels[r] || r).join(', ')}</p>
            {user.roles?.includes('substitute') && user.accessExpiresAt && (
              <p className="mt-0.5 text-[11px] font-medium text-warning">
                Expire le {new Date(user.accessExpiresAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
        <form action="/api/auth/logout" method="POST" className="mt-3">
          <button type="submit" className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium text-stone-600 transition-colors duration-200 hover:text-red-600">
            <LogOut className="size-4" />Déconnexion
          </button>
        </form>
      </div>
    </div>
  )
}
