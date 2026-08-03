'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import { Activity, Menu, X } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'

type Props = {
  doctorName: string | null
  doctorNameShort: string | null
}

const navLinks = [
  { href: '/', key: 'home' },
  { href: '/#presentation', key: 'presentation' },
  { href: '/#services', key: 'services' },
  { href: '/#reviews', key: 'reviews' },
  { href: '/#infos', key: 'infos' },
] as const

export default function Header({ doctorName, doctorNameShort }: Props) {
  const t = useTranslations('nav')
  const { isHidden } = useScrollDirection()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className={`navbar-floating transition-transform duration-300 ${isHidden ? 'nav-hidden' : ''}`}>
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 rounded-2xl bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md md:px-4">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-base font-bold text-primary-700">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
            <Activity className="size-[17px] text-white" />
          </span>
          <span className="hidden sm:inline">{doctorName}</span>
          <span className="sm:hidden">{doctorNameShort}</span>
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map(({ href, key }) => (
            <Link key={href} href={href}
              className="rounded-lg px-[13px] py-2.5 text-[.92rem] font-medium text-stone-600 transition-colors duration-150 hover:bg-cream-200 hover:text-primary-700">
              {t(key)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <a href="/fr#rdv"
            className="hidden h-10 items-center justify-center rounded-xl bg-cta-600 px-[18px] text-[.87rem] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cta-700 hover:-translate-y-0.5 hover:shadow-md md:inline-flex">
            {t('cta')}
          </a>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-[34px] items-center justify-center rounded-lg md:hidden" aria-label="Menu">
            {mobileMenuOpen ? <X className="size-[21px]" /> : <Menu className="size-[21px]" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute start-4 end-4 top-full mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:hidden">
            {navLinks.map(({ href, key }) => (
              <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-[14px] py-[11px] text-[.92rem] font-medium text-stone-600 hover:bg-cream-200">
                {t(key)}
              </Link>
            ))}
            <a href="/fr#rdv" onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-[14px] py-[11px] text-[.92rem] font-bold text-cta-700">
              {t('cta')}
            </a>
          </div>
        )}
      </nav>
    </header>
  )
}
