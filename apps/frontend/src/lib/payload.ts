import { fetchCMS } from './cms-fetch'
import { cookies } from 'next/headers'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

async function fetchAPI<T>(
  path: string,
  tags: string[],
  params?: Record<string, string>,
  locale?: string,
): Promise<T | null> {
  try {
    const url = new URL(`${CMS_URL}${path}`)
    if (locale) url.searchParams.set('locale', locale)
    url.searchParams.set('depth', '1')
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
      }
    }

    const res = await fetch(url.toString(), {
      next: { tags, revalidate: 60 },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.docs ?? json
  } catch {
    return null
  }
}

export type PracticeInfo = {
  id: string
  address: string
  city: string
  tagline: string
  hoursNote: string
  paymentNote: string
  phone: string
  email: string
  coordinates: { lat: number; lng: number }
  schedules: { dayOfWeek: number; open: string; close: string }[]
  exceptionalClosures?: { startDate: string; endDate?: string; label: string }[]
  pricing: unknown
}

export type Service = {
  id: string
  title: string
  description: unknown
  icon: string
  order: number
}

export type Review = {
  id: string
  author: string
  rating: number
  text: string
  date: string
  source: 'google' | 'direct'
  published: boolean
}

export type Doctor = {
  id: string
  name: string
  slug: string
  specialty: string
  bio: unknown
  rpps: string
  photo?: { url?: string } | string | null
  languages: { language: string }[]
}

/** URL média CMS absolue (le champ url est relatif : /api/media/file/…). */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${CMS_URL}${url}`
}

export type CalComSettings = {
  eventSlug: string | null
  username: string | null
  customUrl: string | null
}

export type Tenant = {
  id: string
  name: string
  domain: string
  settings: {
    defaultLocale: string
    activeTier: string
    specialty: string
  }
  calcomSettings: CalComSettings | null
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const data = await fetchAPI<Tenant[]>(
    '/api/tenants',
    [`tenant-domain-${domain}`],
    { 'where[domain][equals]': domain, limit: '1' },
  )
  return data?.[0] ?? null
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const store = await cookies()
  const token = store.get('payload-token')?.value
  if (token) {
    return fetchCMS<Tenant>(`/api/tenants/${id}`)
  }
  return fetchAPI<Tenant>(`/api/tenants/${id}`, [`tenant-${id}`])
}

export async function getPracticeInfo(tenantId: string, locale: string): Promise<PracticeInfo | null> {
  const data = await fetchAPI<PracticeInfo[]>(
    '/api/practice-info',
    [`tenant-${tenantId}`, 'practice-info'],
    { 'where[tenant.id][equals]': tenantId, limit: '1' },
    locale,
  )
  return data?.[0] ?? null
}

export async function getServices(tenantId: string, locale: string): Promise<Service[]> {
  const data = await fetchAPI<Service[]>(
    '/api/services',
    [`tenant-${tenantId}`, 'services'],
    { 'where[tenant.id][equals]': tenantId, sort: 'order', limit: '20' },
    locale,
  )
  return data ?? []
}

export async function getReviews(tenantId: string, locale: string): Promise<Review[]> {
  const data = await fetchAPI<Review[]>('/api/reviews', [`tenant-${tenantId}`, 'reviews', 'published'], undefined, locale)
  return data ?? []
}

export async function getDoctorProfile(tenantId: string, locale: string): Promise<Doctor | null> {
  const data = await fetchAPI<Doctor[]>(
    '/api/doctors',
    [`tenant-${tenantId}`, 'doctor'],
    { 'where[tenant.id][equals]': tenantId, limit: '1' },
    locale,
  )
  return data?.[0] ?? null
}
