import { LayoutDashboard, Users, ListOrdered, BarChart3, Calendar, Settings, FileText, ShieldAlert, LogOut } from 'lucide-react'
import SidebarNav from './SidebarNav'
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
  const roleLabel = user.roles?.map((r) => roleLabels[r] || r).join(', ')

  const navItems: NavItem[] = [
    { label: 'Vue d\'ensemble', href: '/dashboard', icon: <LayoutDashboard className="size-4" /> },
    { label: 'Patients', href: '/dashboard/patients', icon: <Users className="size-4" /> },
    { label: 'File d\'attente', href: '/dashboard/queue', icon: <ListOrdered className="size-4" /> },
    { label: 'Activité', href: '/dashboard/activity', icon: <BarChart3 className="size-4" /> },
    { label: 'Rendez-vous', href: '/dashboard/rendez-vous', icon: <Calendar className="size-4" /> },
    { label: 'Paramètres', href: '/dashboard/settings', icon: <Settings className="size-4" /> },
  ]

  const adminItems: NavItem[] = []

  if (user.roles?.includes('tenant_admin') || user.roles?.includes('superadmin')) {
    adminItems.push({ label: 'Registre d\'audit', href: '/dashboard/audit-logs', icon: <FileText className="size-4" /> })
  }
  if (user.roles?.includes('superadmin')) {
    adminItems.push({ label: 'Alertes système', href: '/dashboard/system-alerts', icon: <ShieldAlert className="size-4" /> })
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
          <p className="text-sm font-bold leading-tight text-[#2A241C]">{tenant?.name || 'Cabinet'}</p>
          <p className="text-[11.5px] text-[#8A8175]">{tierLabels[tenant?.settings?.activeTier || ''] || ''}</p>
        </div>
      </div>

      <SidebarNav items={navItems} adminItems={adminItems} onNavigate={onNavigate} />

      <div className="border-t border-teal/15 px-[10px] pt-4 mt-auto">
        <div className="flex items-center gap-[10px]">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-[13.5px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#2A241C]">{user.name || user.email}</p>
            <p className="text-[11px] text-[#8A8175]">{roleLabel}</p>
            {user.roles?.includes('substitute') && user.accessExpiresAt && (
              <p className="mt-0.5 text-[11px] font-medium text-warning">
                Expire le {new Date(user.accessExpiresAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
        <form action="/api/auth/logout" method="POST" className="mt-3">
          <button type="submit" className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#8A8175] transition-colors duration-200 hover:text-red-600">
            <LogOut className="size-4" />Déconnexion
          </button>
        </form>
      </div>
    </div>
  )
}
