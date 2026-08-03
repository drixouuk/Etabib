'use client'

import { usePathname } from '@/i18n/navigation'

type Props = {
  children: React.ReactNode
  header: React.ReactNode
  footer: React.ReactNode
}

export default function LayoutShell({ children, header, footer }: Props) {
  const pathname = usePathname()
  const hideShell = pathname.startsWith('/dashboard') || pathname.startsWith('/login') || pathname.startsWith('/onboarding')

  return (
    <>
      {!hideShell && header}
      <div className={`${hideShell ? 'flex flex-1 flex-col' : 'flex flex-1 flex-col pt-16 md:pt-20'} app-scroll`}>
        {children}
      </div>
      {!hideShell && footer}
    </>
  )
}
