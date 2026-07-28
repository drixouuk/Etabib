'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Globe, ChevronDown } from 'lucide-react'

const localeCodes = ['fr', 'ar', 'en', 'tzm'] as const

const localeDisplay: Record<string, string> = {
  fr: 'FR',
  ar: 'AR',
  en: 'EN',
  tzm: 'TZM',
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('lang')
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[.85rem] font-semibold text-stone-600 transition-colors hover:bg-cream-200 cursor-pointer"
      >
        <Globe className="size-3.5" />
        {localeDisplay[locale] || locale.toUpperCase()}
        <ChevronDown className="size-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[130px] rounded-xl border border-stone-200 bg-white p-1.5 shadow-md z-50">
          {localeCodes.map((code) => {
            const isActive = code === locale
            return (
              <button
                key={code}
                onClick={() => { router.replace(pathname, { locale: code }); setOpen(false) }}
                className={`w-full rounded-lg px-3 py-2 text-left text-[.87rem] font-body transition-colors hover:bg-cream-200 ${
                  code === 'tzm' ? 'font-tifinagh' : ''
                } ${isActive ? 'bg-cream-100 font-semibold text-primary-700' : 'text-stone-600'}`}
              >
                {t(code)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
