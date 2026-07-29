import { headers } from 'next/headers'
import type { MetadataRoute } from 'next'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'drguinane.etabibi.ma'
  const siteUrl = `https://${host}`

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
