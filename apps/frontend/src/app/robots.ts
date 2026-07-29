import { headers } from 'next/headers'
import type { MetadataRoute } from 'next'
import { SITE_DOMAIN } from '@/lib/brand'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || `drguinane.${SITE_DOMAIN}`
  const siteUrl = `https://${host}`

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
