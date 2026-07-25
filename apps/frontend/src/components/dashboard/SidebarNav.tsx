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
  const allItems = [...items, ...adminItems]
  const activeIndex = allItems.findIndex(item => isActive(item.href, pathname))

  return (
    <nav className="relative flex flex-col gap-0.5 flex-1 pt-1 px-0">
      {items.length > 0 && (
        <>
          <div
            className="absolute left-0 right-0 h-10 rounded-[10px] bg-primary-50 transition-all duration-300 ease-out"
            style={{
              transform: `translateY(${activeIndex * 42}px)`,
              opacity: activeIndex >= 0 ? 1 : 0,
            }}
          />
          {items.map((item) => (
            <Link key={item.label} href={item.href} onClick={onNavigate}
              className={`relative z-10 flex items-center gap-[11px] rounded-[10px] px-3 py-[10px] text-[13.5px] font-medium transition-colors duration-200 ${
                item.disabled ? 'pointer-events-none text-stone-200' :
                isActive(item.href, pathname) ? 'text-primary-700 font-semibold' :
                'text-stone-400 hover:text-stone-800'
              }`}
              aria-disabled={item.disabled} tabIndex={item.disabled ? -1 : undefined}>
              {item.icon}{item.label}
            </Link>
          ))}
        </>
      )}
      {adminItems.length > 0 && (
        <>
          <div className="my-2 border-t border-primary/15" />
          {adminItems.map((item) => (
            <Link key={item.label} href={item.href} onClick={onNavigate}
              className={`relative z-10 flex items-center gap-[11px] rounded-[10px] px-3 py-[10px] text-[13.5px] font-medium transition-colors duration-200 ${
                isActive(item.href, pathname) ? 'text-primary-700 font-semibold' :
                'text-stone-400 hover:text-stone-800'
              }`}>
              {item.icon}{item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  )
}
