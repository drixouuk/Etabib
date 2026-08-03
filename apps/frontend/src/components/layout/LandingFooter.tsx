'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Activity } from 'lucide-react'
import { BRAND, SUPPORT_EMAIL } from '@/lib/brand'

export default function LandingFooter() {
  const t = useTranslations('landing')
  const locale = useLocale()

  return (
    <footer className="pt-[70px] pb-[30px]">
      <div className="container mx-auto max-w-[1160px] px-6">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-9 pb-11">
          <div>
            <a href={`/${locale}/landing`} className="flex items-center gap-2.5 font-heading font-extrabold text-[1.1rem] text-[#2A241C]">
              <span className="flex size-8 items-center justify-center rounded-[9px] bg-primary-600">
                <Activity className="size-[18px] text-white" />
              </span>
              <span className="text-primary-700">{BRAND.name}</span>
            </a>
            <p className="text-[.88rem] text-[#8A8175] max-w-[280px] mt-3.5">{t('footer_desc')}</p>
          </div>
          <div>
            <h5 className="font-heading text-[.86rem] font-bold text-[#2A241C] mb-4">{t('footer_product')}</h5>
            <a href="#fonctionnalites" className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('nav_features')}</a>
            <a href="#tarifs" className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('nav_pricing')}</a>
            <a href="#demo" className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('nav_demo')}</a>
          </div>
          <div>
            <h5 className="font-heading text-[.86rem] font-bold text-[#2A241C] mb-4">{t('footer_support')}</h5>
            <a href="#faq" className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('nav_faq')}</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{SUPPORT_EMAIL}</a>
          </div>
          <div>
            <h5 className="font-heading text-[.86rem] font-bold text-[#2A241C] mb-4">{t('footer_legal')}</h5>
            <a href={`/${locale}/mentions-legales`} className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('footer_legal_1')}</a>
            <a href={`/${locale}/confidentialite`} className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('footer_legal_2')}</a>
            <a href={`/${locale}/cgv`} className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('footer_legal_3')}</a>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 border-t border-stone-200/50 pt-6 text-[.82rem] text-[#B9B2A4]">
          <span>&copy; 2026 {BRAND.name}. {t('footer_rights')}</span>
          <span>{t('footer_made')}</span>
        </div>
      </div>
    </footer>
  )
}
