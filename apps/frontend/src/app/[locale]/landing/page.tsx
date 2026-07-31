'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import {
  Activity, Check, ArrowRight, ChevronDown, Lock, Globe, Calendar, Shield,
  FileText, Users, BarChart3, Menu, X
} from 'lucide-react'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { BRAND, SITE_DOMAIN, SUPPORT_EMAIL } from '@/lib/brand'

const trustItems = [
  { icon: Lock, key: 'trust_1' },
  { icon: Globe, key: 'trust_2' },
  { icon: Calendar, key: 'trust_3' },
  { icon: Shield, key: 'trust_4' },
] as const

const problemSolutionCards = [
  { before: 'ps_1_before', after: 'ps_1_after' },
  { before: 'ps_2_before', after: 'ps_2_after' },
  { before: 'ps_3_before', after: 'ps_3_after' },
] as const

const features: { icon: typeof Globe; key: string; exclusive?: boolean }[] = [
  { icon: Globe, key: 'feat_1' },
  { icon: Calendar, key: 'feat_2' },
  { icon: FileText, key: 'feat_3' },
  { icon: Shield, key: 'feat_4' },
  { icon: BarChart3, key: 'feat_5', exclusive: true },
  { icon: Users, key: 'feat_6' },
  { icon: Lock, key: 'feat_7' },
  { icon: BarChart3, key: 'feat_8' },
] as const

const steps = [
  { num: 1, key: 'step_1' },
  { num: 2, key: 'step_2' },
  { num: 3, key: 'step_3' },
] as const

const faqs = ['faq_1', 'faq_2', 'faq_3', 'faq_4', 'faq_5', 'faq_6'] as const

const DEMO_URL = `https://drdemo.${SITE_DOMAIN}/login`

export default function LandingPage() {
  const t = useTranslations('landing')
  const { isHidden } = useScrollDirection()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<string | null>('faq_1')
  const [chartAnimated, setChartAnimated] = useState(false)
  const chartRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.15 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setChartAnimated(true), 350)
    return () => clearTimeout(timer)
  }, [])

  const navLinks = [
    { href: '#fonctionnalites', key: 'nav_features' },
    { href: '#demo', key: 'nav_demo' },
    { href: '#tarifs', key: 'nav_pricing' },
    { href: '#faq', key: 'nav_faq' },
  ]

  return (
    <div className="min-h-screen bg-cream-100 text-[#2A241C] font-body overflow-x-hidden">
      {/* ========== HEADER ========== */}
      <header className={`fixed top-4 left-4 right-4 z-50 transition-transform duration-300 ${isHidden ? '-translate-y-[calc(100%+1rem)]' : 'translate-y-0'}`}>
        <div className="mx-auto flex max-w-[1160px] items-center justify-between rounded-[18px] bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
          <a href="#" className="flex items-center gap-2.5 font-heading font-extrabold text-[1.1rem] text-[#2A241C]">
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
            <LanguageSwitcher />
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

      <main>
        {/* ========== HERO ========== */}
        <section className="relative overflow-hidden pt-[130px] pb-[60px] max-md:pt-[112px]">
          <span className="absolute size-[420px] rounded-full bg-primary-500/35 blur-[70px] -top-[140px] -left-[160px] z-0" />
          <span className="absolute size-[340px] rounded-full bg-amber-500/28 blur-[70px] -bottom-[120px] -right-[100px] z-0" />
          <div className="container relative z-10 mx-auto max-w-[1160px] px-6 grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] items-center gap-14">
            <div>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide">
                {t('hero_badge')}
              </span>
              <h1 className="text-[clamp(2.15rem,4vw,3.15rem)] font-heading font-extrabold text-[#2A241C] mb-5 leading-tight tracking-[-.01em]">
                {t('hero_title_1')} <em className="not-italic text-primary-700">{t('hero_title_em')}</em> {t('hero_title_2')}
              </h1>
              <p className="text-[1.13rem] text-[#8A8175] max-w-[520px] mb-8">{t('hero_sub')}</p>
              <div className="flex flex-wrap gap-3.5 mb-5">
                <a href={DEMO_URL} target="_blank" rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-cta-600 px-7 py-3.5 text-[.97rem] font-bold text-white shadow-sm transition-all hover:bg-cta-700 hover:-translate-y-0.5 hover:shadow-md">
                  {t('hero_cta_primary')} <ArrowRight className="size-[18px]" />
                </a>
                <a href="#tarifs"
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200/50 bg-transparent px-7 py-3.5 text-[.97rem] font-bold text-[#2A241C] transition-all hover:border-primary-500 hover:text-primary-700 hover:bg-white">
                  {t('hero_cta_secondary')}
                </a>
              </div>
              <div className="flex flex-wrap gap-[18px] text-[.87rem] font-semibold text-[#B9B2A4]">
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary-500" />{t('hero_trust_1')}</span>
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary-500" />{t('hero_trust_2')}</span>
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary-500" />{t('hero_trust_3')}</span>
              </div>
            </div>

            {/* Clinical card */}
            <div className="relative max-md:max-w-[460px] max-md:mx-auto">
              <div className="absolute -top-4 right-5 z-10 rounded-full border border-stone-200 bg-white px-4 py-2 shadow-md flex items-center gap-1.5 text-[.78rem] font-bold text-primary-700">
                <BarChart3 className="size-3.5 text-primary-500" />{t('hero_badge_floating')}
              </div>
              <div className="rounded-[28px] border border-stone-200/50 bg-white p-[26px_26px_20px] shadow-lg">
                <div className="flex items-center gap-3 mb-1">
                  <div className="size-10 rounded-full bg-gradient-to-br from-amber-500 to-cta-500 flex items-center justify-center font-heading font-extrabold text-[.85rem] text-white shrink-0">
                    {t('hero_avatar_initials')}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-[.98rem] text-[#2A241C]">{t('hero_avatar_name')}</p>
                    <p className="text-[.82rem] text-[#B9B2A4]">{t('hero_avatar_sub')}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-primary-50 px-2.5 py-1 text-[.74rem] font-bold text-primary-700 whitespace-nowrap">{t('hero_tag')}</span>
                </div>
                <p className="text-[.78rem] font-bold text-[#B9B2A4] uppercase tracking-[0.06em] mt-3.5 mb-1.5">{t('hero_chart_title')}</p>
                <svg ref={chartRef} className="w-full h-auto" viewBox="0 0 400 220">
                  <line className="stroke-stone-200/50 stroke-1 stroke-dasharray-[3_4]" x1="30" y1="180" x2="380" y2="180" />
                  <line className="stroke-stone-200/50 stroke-1 stroke-dasharray-[3_4]" x1="30" y1="105" x2="380" y2="105" />
                  <line className="stroke-stone-200/50 stroke-1 stroke-dasharray-[3_4]" x1="30" y1="35" x2="380" y2="35" />
                  <text className="text-[9px] fill-[#B9B2A4]" x="4" y="183">3kg</text>
                  <text className="text-[9px] fill-[#B9B2A4]" x="4" y="108">7kg</text>
                  <text className="text-[9px] fill-[#B9B2A4]" x="1" y="38">11kg</text>
                  <path className="fill-none stroke-[#CFE4E1] stroke-[1.6] opacity-55" d="M30,150 C90,90 150,50 200,35 C260,20 320,15 380,10" />
                  <path className="fill-none stroke-[#9FCCC5] stroke-[1.6] opacity-55" d="M30,165 C90,120 150,85 200,68 C260,52 320,42 380,35" />
                  <path className="fill-none stroke-[#CFE4E1] stroke-[1.6] opacity-55" d="M30,180 C90,150 150,120 200,105 C260,90 320,78 380,68" />
                  <path className={`fill-none stroke-cta-500 stroke-[3] stroke-linecap-round stroke-linejoin-round transition-all duration-[1.6s] ease-out ${chartAnimated ? 'stroke-dashoffset-0' : 'stroke-dasharray-640 stroke-dashoffset-640'}`} d="M30,178 C70,160 110,140 150,120 C190,100 230,80 270,62 C300,50 340,42 380,38" />
                  {[
                    { cx: 30, cy: 178, delay: 0 },
                    { cx: 150, cy: 120, delay: 1 },
                    { cx: 270, cy: 62, delay: 2 },
                    { cx: 380, cy: 38, delay: 3 },
                  ].map((dot, i) => (
                    <circle key={i} cx={dot.cx} cy={dot.cy} r="4" className={`fill-cta-500 transition-all duration-300 ease-out ${chartAnimated ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} style={{ transitionDelay: `${300 + dot.delay * 380}ms` }} />
                  ))}
                  <g className={`transition-opacity duration-400 ${chartAnimated ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '1700ms' }}>
                    <rect className="fill-[#2A241C]" x="272" y="6" width="100" height="24" rx="7" />
                    <text className="text-[10.5px] font-heading font-bold fill-white" x="322" y="22" textAnchor="middle">{t('hero_percentile')}</text>
                  </g>
                  <text className="text-[9px] fill-[#B9B2A4]" x="24" y="200">{t('hero_chart_0')}</text>
                  <text className="text-[9px] fill-[#B9B2A4]" x="138" y="200">{t('hero_chart_6')}</text>
                  <text className="text-[9px] fill-[#B9B2A4]" x="258" y="200">{t('hero_chart_12')}</text>
                  <text className="text-[9px] fill-[#B9B2A4]" x="358" y="200">{t('hero_chart_18')}</text>
                </svg>
                <div className="flex gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[.74rem] font-semibold text-[#B9B2A4]"><span className="size-3.5 rounded-sm" style={{ background: '#CFE4E1' }} />P3 – P97</span>
                  <span className="flex items-center gap-1.5 text-[.74rem] font-semibold text-[#B9B2A4]"><span className="size-3.5 rounded-sm" style={{ background: '#EA580C' }} />{t('hero_chart_label')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== TRUST BAR ========== */}
        <section className="border-y border-stone-200/50 py-[34px]">
          <div className="container mx-auto max-w-[1160px] px-6 flex justify-center items-center flex-wrap gap-[38px]">
            {trustItems.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-center gap-2.5 font-bold text-[.92rem] text-[#8A8175]">
                <Icon className="size-5 text-primary-500 shrink-0" />
                {t(key)}
              </div>
            ))}
          </div>
        </section>

        {/* ========== PROBLEM/SOLUTION ========== */}
        <section className="py-[104px] max-md:py-[68px]">
          <div className="container mx-auto max-w-[1160px] px-6">
            <div className="reveal max-w-[640px] mx-auto mb-[52px] text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide mb-4">{t('ps_eyebrow')}</span>
              <h2 className="text-[clamp(1.7rem,3vw,2.35rem)] font-heading font-extrabold text-[#2A241C] mb-3.5">{t('ps_title')}</h2>
              <p className="text-[1.05rem] text-[#8A8175]">{t('ps_sub')}</p>
            </div>
            <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-[26px]">
              {problemSolutionCards.map((card) => (
                <div key={card.before} className="rounded-[20px] border border-stone-200/50 bg-white p-[30px]">
                  <div className="flex gap-3 items-start pb-[11px]">
                    <span className="size-[7px] mt-2 rounded-full bg-[#B9B2A4] shrink-0" />
                    <p className="text-[.92rem] text-[#B9B2A4]">{t(card.before)}</p>
                  </div>
                  <div className="flex gap-3 items-start border-t border-dashed border-stone-200/50 pt-[18px] mt-1">
                    <Check className="size-[19px] text-primary-500 shrink-0 mt-0.5" />
                    <p className="text-[.96rem] font-semibold text-[#2A241C]">{t(card.after)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== FEATURES ========== */}
        <section id="fonctionnalites" className="border-y border-stone-200/50 bg-white py-[104px] max-md:py-[68px]">
          <div className="container mx-auto max-w-[1160px] px-6">
            <div className="reveal max-w-[640px] mx-auto mb-[52px] text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide mb-4">{t('feat_eyebrow')}</span>
              <h2 className="text-[clamp(1.7rem,3vw,2.35rem)] font-heading font-extrabold text-[#2A241C] mb-3.5">{t('feat_title')}</h2>
              <p className="text-[1.05rem] text-[#8A8175]">{t('feat_sub')}</p>
            </div>
            <div className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[22px]">
              {features.map(({ icon: Icon, key, exclusive }) => (
                <div key={key} className="relative rounded-[20px] border border-stone-200/50 bg-white p-[28px_24px] transition-all hover:-translate-y-1 hover:shadow-md">
                  {exclusive && <span className="absolute top-5 right-5 rounded-full bg-amber-50 px-2 py-1 text-[.68rem] font-extrabold text-[#8a5a05] tracking-wider">{t('exclusive')}</span>}
                  <div className="flex size-[46px] items-center justify-center rounded-[13px] bg-primary-50 text-primary-700 mb-[18px]">
                    <Icon className="size-[23px]" />
                  </div>
                  <h3 className="text-[1.02rem] font-heading font-bold text-[#2A241C] mb-2">{t(`${key}_title`)}</h3>
                  <p className="text-[.9rem] text-[#8A8175]">{t(`${key}_desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== HOW IT WORKS ========== */}
        <section className="py-[104px] max-md:py-[68px]">
          <div className="container mx-auto max-w-[1160px] px-6">
            <div className="reveal max-w-[640px] mx-auto mb-[52px] text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide mb-4">{t('steps_eyebrow')}</span>
              <h2 className="text-[clamp(1.7rem,3vw,2.35rem)] font-heading font-extrabold text-[#2A241C] mb-3.5">{t('steps_title')}</h2>
              <p className="text-[1.05rem] text-[#8A8175]">{t('steps_sub')}</p>
            </div>
            <div className="reveal relative grid grid-cols-1 md:grid-cols-3 gap-2 max-md:gap-9">
              <div className="hidden md:block absolute top-[29px] left-[12%] right-[12%] h-0.5 bg-repeating-linear-gradient-90 border-stone-200/50 z-0" style={{ background: 'repeating-linear-gradient(90deg, rgba(42,36,28,0.1) 0 10px, transparent 10px 18px)' }} />
              {steps.map(({ num, key }) => (
                <div key={key} className="text-center relative z-1 px-[18px]">
                  <div className="flex size-[58px] items-center justify-center rounded-full border-2 border-primary-500 bg-white text-primary-700 font-heading font-extrabold text-[1.25rem] mx-auto mb-5">{num}</div>
                  <h3 className="text-[1.05rem] font-heading font-bold text-[#2A241C] mb-2">{t(`${key}_title`)}</h3>
                  <p className="text-[.9rem] text-[#8A8175] max-w-[250px] mx-auto">{t(`${key}_desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== DEMO ========== */}
        <section id="demo" className="border-y border-stone-200/50 bg-white py-[104px] max-md:py-[68px]">
          <div className="container mx-auto max-w-[1160px] px-6">
            <div className="reveal max-w-[640px] mx-auto text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide mb-4">{t('demo_eyebrow')}</span>
              <h2 className="text-[clamp(1.6rem,3vw,2.1rem)] font-heading font-extrabold text-[#2A241C] mb-3.5">{t('demo_title')}</h2>
              <p className="text-[1.02rem] text-[#8A8175] max-w-[480px] mx-auto mb-[26px]">{t('demo_sub')}</p>
              <a href={DEMO_URL} target="_blank" rel="noopener"
                className="inline-flex items-center gap-2 rounded-full bg-cta-600 px-7 py-3.5 text-[.97rem] font-bold text-white shadow-sm transition-all hover:bg-cta-700 hover:-translate-y-0.5 hover:shadow-md">
                {t('demo_card_cta')} <ArrowRight className="size-[18px]" />
              </a>
            </div>
          </div>
        </section>

        {/* ========== PRICING ========== */}
        <section id="tarifs" className="py-[104px] max-md:py-[68px]">
          <div className="container mx-auto max-w-[1160px] px-6">
            <div className="reveal max-w-[640px] mx-auto mb-[52px] text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide mb-4">{t('price_eyebrow')}</span>
              <h2 className="text-[clamp(1.7rem,3vw,2.35rem)] font-heading font-extrabold text-[#2A241C] mb-3.5">{t('price_title')}</h2>
              <p className="text-[1.05rem] text-[#8A8175]">{t('price_sub')}</p>
            </div>
            <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-md:max-w-[420px] max-md:mx-auto">
              {/* Vitrine */}
              <div className="rounded-[28px] border border-stone-200/50 bg-white p-[34px_28px] flex flex-col">
                <p className="font-heading font-bold text-[1.15rem] text-[#2A241C] mb-[10px]">{t('price_vitrine')}</p>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="font-heading font-extrabold text-[2.15rem] text-primary-700">{t('price_free')}</span>
                </div>
                <p className="text-[.78rem] text-[#B9B2A4] mb-5 min-h-[16px]">{t('price_vitrine_note')}</p>
                <ul className="mb-7 flex-1 space-y-1">
                  {['price_vitrine_f1', 'price_vitrine_f2', 'price_vitrine_f3', 'price_vitrine_f4', 'price_vitrine_f5'].map(f => (
                    <li key={f} className="flex items-start gap-2 py-1.5 text-[.91rem] text-[#8A8175]">
                      <Check className="size-4 text-primary-500 shrink-0 mt-0.5" />{t(f)}
                    </li>
                  ))}
                </ul>
                <Link href="/onboarding?plan=vitrine" className="inline-flex w-full items-center justify-center rounded-full border border-stone-200/50 bg-transparent px-6 py-3 text-[.97rem] font-bold text-[#2A241C] transition-all hover:border-primary-500 hover:text-primary-700 hover:bg-white">{t('price_cta_vitrine')}</Link>
              </div>
              {/* RDV */}
              <div className="rounded-[28px] border border-stone-200/50 bg-white p-[34px_28px] flex flex-col">
                <p className="font-heading font-bold text-[1.15rem] text-[#2A241C] mb-[10px]">RDV</p>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="font-heading font-extrabold text-[2.15rem] text-primary-700">199 MAD</span>
                  <span className="text-[.85rem] text-[#B9B2A4] font-semibold">/ {t('price_month')}</span>
                </div>
                <p className="text-[.78rem] text-[#B9B2A4] mb-5 min-h-[16px]">{t('price_rdv_note')}</p>
                <ul className="mb-7 flex-1 space-y-1">
                  {['price_rdv_f1', 'price_rdv_f2', 'price_rdv_f3', 'price_rdv_f4'].map(f => (
                    <li key={f} className="flex items-start gap-2 py-1.5 text-[.91rem] text-[#8A8175]">
                      <Check className="size-4 text-primary-500 shrink-0 mt-0.5" />{t(f)}
                    </li>
                  ))}
                </ul>
                <Link href="/onboarding?plan=rdv" className="inline-flex w-full items-center justify-center rounded-full border border-stone-200/50 bg-transparent px-6 py-3 text-[.97rem] font-bold text-[#2A241C] transition-all hover:border-primary-500 hover:text-primary-700 hover:bg-white">{t('price_cta_rdv')}</Link>
              </div>
              {/* Cabinet — featured */}
              <div className="rounded-[28px] border-2 border-primary-500 bg-white p-[34px_28px] flex flex-col shadow-lg relative scale-[1.03] max-md:scale-100">
                <span className="absolute -top-[15px] left-1/2 -translate-x-1/2 rounded-full bg-primary-500 text-white text-[.76rem] font-extrabold px-[18px] py-1.5 shadow-sm whitespace-nowrap">{t('price_ribbon')}</span>
                <p className="font-heading font-bold text-[1.15rem] text-[#2A241C] mb-[10px]">{t('price_cabinet')}</p>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="font-heading font-extrabold text-[2.15rem] text-primary-700">499 MAD</span>
                  <span className="text-[.85rem] text-[#B9B2A4] font-semibold">/ {t('price_month')}</span>
                </div>
                <p className="text-[.78rem] text-[#B9B2A4] mb-5 min-h-[16px]">{t('price_cabinet_note')}</p>
                <ul className="mb-7 flex-1 space-y-1">
                  {['price_cabinet_f1', 'price_cabinet_f2', 'price_cabinet_f3', 'price_cabinet_f4', 'price_cabinet_f5', 'price_cabinet_f6', 'price_cabinet_f7', 'price_cabinet_f8', 'price_cabinet_f9'].map(f => (
                    <li key={f} className="flex items-start gap-2 py-1.5 text-[.91rem] text-[#8A8175]">
                      <Check className="size-4 text-primary-500 shrink-0 mt-0.5" />{t(f)}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2.5">
                  <Link href="/onboarding?plan=cabinet"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta-600 px-6 py-3 text-[.97rem] font-bold text-white shadow-sm transition-all hover:bg-cta-700">
                    {t('price_cta_cabinet')} <ArrowRight className="size-[18px]" />
                  </Link>
                  <a href={DEMO_URL} target="_blank" rel="noopener"
                    className="inline-flex w-full items-center justify-center rounded-full border border-stone-200/50 bg-transparent px-6 py-3 text-[.97rem] font-bold text-[#2A241C] transition-all hover:border-primary-500 hover:text-primary-700 hover:bg-white">
                    {t('price_cta_demo')}
                  </a>
                </div>
              </div>
            </div>
            <p className="text-center text-[.85rem] text-[#B9B2A4] mt-[30px]">{t('price_fineprint')}</p>
          </div>
        </section>

        {/* ========== SECURITY ========== */}
        <section className="border-y border-stone-200/50 bg-white py-[104px] max-md:py-[68px]">
          <div className="container mx-auto max-w-[1160px] px-6">
            <div className="reveal max-w-[640px] mx-auto mb-[52px] text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide mb-4">{t('sec_eyebrow')}</span>
              <h2 className="text-[clamp(1.7rem,3vw,2.35rem)] font-heading font-extrabold text-[#2A241C] mb-3.5">{t('sec_title')}</h2>
            </div>
            <div className="reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[22px] mb-9">
              {['sec_1', 'sec_2', 'sec_3', 'sec_4'].map(key => (
                <div key={key} className="text-center">
                  <div className="flex size-[46px] items-center justify-center rounded-[13px] bg-primary-50 text-primary-700 mx-auto mb-3.5">
                    <Shield className="size-[23px]" />
                  </div>
                  <h3 className="text-[.95rem] font-heading font-bold text-[#2A241C] mb-1.5">{t(`${key}_title`)}</h3>
                  <p className="text-[.84rem] text-[#8A8175]">{t(`${key}_desc`)}</p>
                </div>
              ))}
            </div>
            <p className="reveal text-center text-[.92rem] font-semibold text-[#8A8175] rounded-[20px] bg-primary-50 py-[18px] px-6 max-w-[640px] mx-auto">{t('sec_fact')}</p>
          </div>
        </section>

        {/* ========== FAQ ========== */}
        <section id="faq" className="py-[104px] max-md:py-[68px]">
          <div className="container mx-auto max-w-[1160px] px-6">
            <div className="reveal max-w-[640px] mx-auto mb-[52px] text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-[.82rem] font-bold text-primary-700 tracking-wide mb-4">{t('faq_eyebrow')}</span>
              <h2 className="text-[clamp(1.7rem,3vw,2.35rem)] font-heading font-extrabold text-[#2A241C] mb-3.5">{t('faq_title')}</h2>
            </div>
            <div className="reveal max-w-[760px] mx-auto">
              {faqs.map(key => (
                <div key={key} className="border-b border-stone-200/50">
                  <button onClick={() => setOpenFaq(openFaq === key ? null : key)}
                    className="flex w-full items-center justify-between gap-4 py-[22px] px-1 text-left font-heading font-bold text-[1.02rem] text-[#2A241C]">
                    {t(`${key}_q`)}
                    <ChevronDown className={`size-5 text-primary-500 shrink-0 transition-transform duration-200 ${openFaq === key ? 'rotate-45' : ''}`} />
                  </button>
                  {openFaq === key && <p className="px-1 pb-[22px] text-[.94rem] text-[#8A8175] max-w-[640px]">{t(`${key}_a`)}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== FINAL CTA ========== */}
        <section className="pt-0 pb-[104px] max-md:pb-[68px]">
          <div className="reveal mx-6 max-md:mx-3 rounded-[28px] bg-gradient-to-br from-primary-700 to-primary-500 relative overflow-hidden px-10 py-16 text-center max-md:px-5 max-md:py-12">
            <span className="absolute size-[340px] rounded-full bg-white/8 -top-[160px] -right-[80px]" />
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-heading font-extrabold text-white mb-3 relative">{t('cta_title')}</h2>
            <p className="text-white/85 mb-[30px] text-[1.05rem] relative">{t('cta_sub')}</p>
            <div className="flex flex-wrap justify-center gap-3.5 relative">
              <a href={DEMO_URL} target="_blank" rel="noopener"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[.97rem] font-bold text-primary-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                {t('cta_primary')} <ArrowRight className="size-[18px]" />
              </a>
              <a href="#tarifs"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/55 bg-transparent px-7 py-3.5 text-[.97rem] font-bold text-white transition-all hover:bg-white/12 hover:border-white">
                {t('cta_secondary')}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="pt-[70px] pb-[30px]">
        <div className="container mx-auto max-w-[1160px] px-6">
          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-9 pb-11">
            <div>
              <a href="#" className="flex items-center gap-2.5 font-heading font-extrabold text-[1.1rem] text-[#2A241C]">
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
              <a href="#" className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('footer_legal_1')}</a>
              <a href="#" className="block text-[.88rem] text-[#8A8175] py-1.5 hover:text-primary-700">{t('footer_legal_2')}</a>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-2.5 border-t border-stone-200/50 pt-6 text-[.82rem] text-[#B9B2A4]">
            <span>&copy; 2026 {BRAND.name}. {t('footer_rights')}</span>
            <span>{t('footer_made')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
