'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Activity, Menu, X } from 'lucide-react'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { BRAND, SITE_DOMAIN } from '@/lib/brand'

const DEMO_URL = `https://drdemo.${SITE_DOMAIN}/login`

type Props = {
  hideLanguageSwitcher?: boolean
}

export default function LandingHeader({ hideLanguageSwitcher = false }: Props) {
  const t = useTranslations('landing')
  const locale = useLocale()
  const { isHidden } = useScrollDirection()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '#fonctionnalites', key: 'nav_features' },
    { href: '#demo', key: 'nav_demo' },
    { href: '#tarifs', key: 'nav_pricing' },
    { href: '#faq', key: 'nav_faq' },
  ]

  return (
    <header className={`fixed top-4 left-4 right-4 z-50 transition-transform duration-300 ${isHidden ? '-translate-y-[calc(100%+1rem)]' : 'translate-y-0'}`}>
      <div className="mx-auto flex max-w-[1160px] items-center justify-between rounded-[18px] bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
        <a href={`/${locale}/landing`} className="flex items-center gap-2.5 font-heading font-extrabold text-[1.1rem] text-[#2A241C]">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-primary-600">
            <Activity className="size-[18px] text-white" />
          </span>
          <span className="text-primary-700">{BRAND.name}</span>
        </a>
        <nav className={`hidden md:flex items-center gap-1 ${mobileOpen ? 'max-md:flex max-md:flex-col max-md:absolute max-md:top-full max-md:left-0 max-md:right-0 max-md:bg-white max-md:border max-md:border-stone-200 max-md:rounded-2xl max-md:p-2 max-md:shadow-md max-md:mt-2' : ''}`}>
          {navLinks.map(({ href, key }) => (
            <a key={href} href={href} onClick={() => setMobileOpen(false)}
              className="rounded-[10px] px-3 py-2 text-[.92rem] font-semibold text-[#8A8175] transition-colors hover:text-primary-700 hover:bg-primary-50">
              {t(key)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3.5">
          {!hideLanguageSwitcher && <LanguageSwitcher />}
          <a href={DEMO_URL} target="_blank" rel="noopener"
            className="hidden md:inline-flex items-center gap-2 rounded-full bg-cta-600 px-5 py-2.5 text-[.88rem] font-bold text-white shadow-sm transition-all hover:bg-cta-700 hover:-translate-y-0.5 hover:shadow-md">
            {t('header_cta')}
          </a>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="flex size-9 items-center justify-center md:hidden" aria-label="Menu">
            {mobileOpen ? <X className="size-[22px]" /> : <Menu className="size-[22px]" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="absolute left-4 right-4 top-full mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-md md:hidden">
            {navLinks.map(({ href, key }) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3.5 py-3 text-[.92rem] font-semibold text-[#8A8175] hover:bg-primary-50">
                {t(key)}
              </a>
            ))}
            <a href={DEMO_URL} target="_blank" rel="noopener"
              className="block mt-1 rounded-full bg-cta-600 px-4 py-2.5 text-center text-sm font-bold text-white">
              {t('header_cta')}
            </a>
          </div>
        )}
      </div>
    </header>
  )
}
