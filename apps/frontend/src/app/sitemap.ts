import { headers } from 'next/headers'
import type { MetadataRoute } from 'next'

const locales = ['fr', 'ar', 'en', 'tzm'] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'drguinane.etabibi.ma'
  const siteUrl = `https://${host}`

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    entries.push({
      url: `${siteUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: locale === 'fr' ? 1 : 0.8,
    })
  }

  return entries
}
