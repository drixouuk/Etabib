import type { MetadataRoute } from 'next'
import { SITE_DOMAIN } from '@/lib/brand'

const locales = ['fr', 'ar', 'en', 'tzm'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = `https://${SITE_DOMAIN}`

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    entries.push(
      {
        // Landing SaaS localisée (les racines /[locale] redirigent en 308
        // vers /[locale]/landing depuis le point 10 — on ne liste que l'URL finale).
        url: `${siteUrl}/${locale}/landing`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: locale === 'fr' ? 1 : 0.8,
      },
      {
        url: `${siteUrl}/${locale}/mentions-legales`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.2,
      },
      {
        url: `${siteUrl}/${locale}/cgv`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.2,
      },
      {
        url: `${siteUrl}/${locale}/confidentialite`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.2,
      },
    )
  }

  return entries
}
