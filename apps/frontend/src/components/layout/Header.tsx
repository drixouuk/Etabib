'use client'

import { useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import { Menu, X } from 'lucide-react'
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

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

export default function Header({ doctorName, doctorNameShort }: Props) {
  const t = useTranslations('nav')
  const { isHidden, show } = useScrollDirection()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header
      className={`navbar-floating relative transition-transform duration-300 ${
        isHidden ? '-translate-y-[calc(100%+2rem)]' : 'translate-y-0'
      }`}
    >
      <nav
        className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md md:px-6"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          onClick={(e) => {
            show()
            if (isHome) { e.preventDefault(); scrollToTop() }
          }}
          className="flex items-center gap-2 text-lg font-semibold text-primary-700 hover:text-primary-600 transition-colors duration-200"
        >
          <span className="hidden sm:inline">{doctorName ?? ''}</span>
          <span className="sm:hidden">{doctorNameShort ?? ''}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, key }) => (
            <Link key={href} href={href} onClick={(e) => { show(); if (href === '/' && isHome) { e.preventDefault(); scrollToTop() } }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-cream-200 hover:text-primary-700 transition-colors duration-200">
              {t(key)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-stone-600 hover:bg-cream-200 md:hidden" aria-label="Menu">
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link href="/fr#rdv"
            className="hidden h-10 items-center justify-center rounded-lg bg-cta-700 px-4 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-cta-800 md:inline-flex">
            {t('cta')}
          </Link>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="absolute left-4 right-4 top-full mt-2 rounded-xl border border-stone-200 bg-white p-2 shadow-lg md:hidden z-50">
          {navLinks.map(({ href, key }) => (
            <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-cream-100 hover:text-primary-700">
              {t(key)}
            </Link>
          ))}
          <hr className="my-1 border-stone-100" />
          <Link href="/fr#rdv" onClick={() => setMobileMenuOpen(false)}
            className="block w-full rounded-lg bg-cta-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cta-800 text-center">
            {t('cta')}
          </Link>
        </div>
      )}
    </header>
  )
}
