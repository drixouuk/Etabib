import { getTranslations } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import {
  Baby,
  Syringe,
  HeartPulse,
  Stethoscope,
  Apple,
  FileCheck,
} from 'lucide-react'
import type { Service } from '@/lib/payload'

type Props = {
  locale: string
  services: Service[]
}

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Baby,
  Syringe,
  HeartPulse,
  Stethoscope,
  Apple,
  FileCheck,
}

export default async function ServicesSection({ locale, services }: Props) {
  const t = await getTranslations({ locale, namespace: 'services' })

  if (services.length === 0) return null

  return (
    <section id="services" className="scroll-mt-24 border-y border-stone-200 bg-white px-4 py-[88px] md:py-[60px]">
      <div className="container mx-auto max-w-[1200px]">
        <div className="mx-auto mb-12 max-w-[620px] text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1.5 text-[.8rem] font-bold text-primary-700">
            Services
          </span>
          <h2 className="text-[clamp(1.6rem,3vw,2.15rem)] font-heading font-extrabold text-stone-800">
            {t('title')}
          </h2>
          <p className="mt-2.5 text-stone-600">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = serviceIcons[service.icon] || HeartPulse
            return (
              <div key={service.id} className="rounded-2xl border border-stone-200 bg-white p-[26px] transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon className="size-[22px]" />
                </div>
                <h3 className="mb-1.5 font-heading text-base font-bold text-stone-800">{service.title}</h3>
                <div className="text-[.89rem] text-stone-600 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <RichText data={service.description as any} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
