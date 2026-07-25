import { Activity, LayoutDashboard, Users, ListOrdered, BarChart3, Calendar, Settings, FileText, ShieldAlert, LogOut } from 'lucide-react'
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
    dossier: 'Cabinet individuel',
    clinique: 'Cabinet de groupe',
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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-[10px] px-[10px] pb-[22px] pt-[2px]">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary-600">
          <Activity className="size-[18px] text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-stone-800">{tenant?.name || 'Cabinet'}</p>
          <p className="text-[11.5px] text-stone-400">{tenant?.settings?.activeTier ? tierLabels[tenant.settings.activeTier] || tenant.settings.activeTier : ''}</p>
        </div>
      </div>

      <SidebarNav items={navItems} adminItems={adminItems} onNavigate={onNavigate} />

      <div className="border-t border-primary/15 px-3 py-4 mt-auto">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-stone-800">{user.name || user.email}</p>
            <p className="truncate text-[11px] text-stone-400">{roleLabel}</p>
            {user.roles?.includes('substitute') && user.accessExpiresAt && (
              <p className="mt-0.5 text-xs text-warning">Accès jusqu'au {new Date(user.accessExpiresAt).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-red-600">
            <LogOut className="size-4" />Déconnexion
          </button>
        </form>
      </div>
    </div>
  )
}
