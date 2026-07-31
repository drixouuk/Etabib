import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'etabibi.ma'

const SUBDOMAIN_BLACKLIST = [
  'admin','api','app','www','mail','smtp','pop','imap','ftp','cdn','dev','staging',
  'test','demo','blog','shop','store','help','support','status','docs','dashboard',
  'cms','static','assets','media','files','images','img','css','js','web','portal',
  'site','www2','m','mobile','etabib','etabibi','root','localhost','null','undefined',
]

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  rateLimit(`check-subdomain:${ip}`, 30, 60_000)

  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: 'domain requis' }, { status: 400 })

  const subdomain = domain.split('.')[0].toLowerCase()
  if (SUBDOMAIN_BLACKLIST.includes(subdomain)) {
    return NextResponse.json({ available: false, reason: 'blacklisted' })
  }
  if (subdomain.length < 3) {
    return NextResponse.json({ available: false, reason: 'too-short' })
  }

  const fullDomain = `${subdomain}.${SITE_DOMAIN}`
  const res = await fetch(`${CMS_URL}/api/resolve-tenant?domain=${encodeURIComponent(fullDomain)}`)
  const data = await res.json().catch(() => null)
  const available = !data?.tenant

  return NextResponse.json({ available })
}
