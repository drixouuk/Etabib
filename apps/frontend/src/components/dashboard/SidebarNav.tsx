'use client'

import { usePathname } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  disabled?: boolean
}

type Props = {
  items: NavItem[]
  adminItems: NavItem[]
  onNavigate?: () => void
}

function isActive(href: string, pathname: string): boolean {
  if (href === '#') return false
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/'
  return pathname.startsWith(href)
}

export default function SidebarNav({ items, adminItems, onNavigate }: Props) {
  const pathname = usePathname()
  const activeIndex = [...items, ...adminItems].findIndex((item) => isActive(item.href, pathname))

  return (
    <nav className="relative flex flex-1 flex-col gap-0.5 pt-1">
      <div
        className="absolute left-0 right-0 h-10 rounded-[10px] bg-primary-50 transition-all duration-300 ease-out z-0"
        style={{
          transform: `translateY(${activeIndex >= 0 && activeIndex < items.length ? activeIndex * 42 : 0}px)`,
          opacity: activeIndex >= 0 ? 1 : 0,
        }}
      />
      {items.map((item) => {
        const active = isActive(item.href, pathname)
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={`relative z-10 flex items-center gap-[11px] rounded-[10px] px-3 py-[10px] text-[13.5px] font-medium transition-colors duration-200 ${
              item.disabled
                ? 'pointer-events-none text-ink-softer'
                : active
                  ? 'text-primary-700 font-semibold'
                  : 'text-ink-soft hover:text-ink'
            }`}
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : undefined}
          >
            {item.icon}
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        )
      })}
      {adminItems.length > 0 && (
        <>
          <div className="my-2 border-t border-teal/15" />
          {adminItems.map((item) => {
            const active = isActive(item.href, pathname)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={`relative z-10 flex items-center gap-[11px] rounded-[10px] px-3 py-[10px] text-[13.5px] font-medium transition-colors duration-200 ${
                  active ? 'text-primary-700 font-semibold' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            )
          })}
        </>
      )}
    </nav>
  )
}
