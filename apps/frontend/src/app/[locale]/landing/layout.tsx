import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { SITE_URL } from '@/lib/brand'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Etabib — Gestion de cabinet médical au Maroc',
    description:
      'Site vitrine, prise de rendez-vous en ligne et gestion complète de dossiers patients pour les cabinets médicaux indépendants au Maroc.',
    alternates: {
      canonical: `${SITE_URL}/${locale}/landing`,
      languages: {
        fr: `${SITE_URL}/fr/landing`,
        en: `${SITE_URL}/en/landing`,
        ar: `${SITE_URL}/ar/landing`,
        zgh: `${SITE_URL}/tzm/landing`,
      } as Record<string, string>,
    },
    openGraph: {
      title: 'Etabib — Gestion de cabinet médical au Maroc',
      description:
        'La plateforme de gestion pensée pour les cabinets médicaux indépendants au Maroc.',
      url: `${SITE_URL}/${locale}/landing`,
      siteName: 'Etabib',
    },
  }
}

export default async function LandingLayout({ children, params }: { children: React.ReactNode; params: Props['params'] }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing' })

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Etabib',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: [
      { '@type': 'Offer', name: 'Vitrine', price: '0', priceCurrency: 'MAD' },
      { '@type': 'Offer', name: 'RDV', price: '199', priceCurrency: 'MAD' },
      { '@type': 'Offer', name: 'Cabinet', price: '499', priceCurrency: 'MAD' },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [1, 2, 3, 4, 5, 6].map(i => ({
      '@type': 'Question',
      name: t(`faq_${i}_q`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faq_${i}_a`) },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {children}
    </>
  )
}
