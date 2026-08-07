import { NextResponse } from 'next/server'
import { CNSS_PORTAL_URL } from '@/lib/brand'

// Check d'embeddabilité du portail CNSS (FSE) : les headers X-Frame-Options
// et Content-Security-Policy (frame-ancestors) sont lus côté SERVEUR (un
// iframe cross-origin bloqué est silencieux côté navigateur). Résultat mis
// en cache 1h — ces headers ne changent pas souvent. Si le portail est
// injoignable, embeddable=false : le composant bascule en nouvel onglet.
export async function GET() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(CNSS_PORTAL_URL, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      next: { revalidate: 3600 },
    }).catch(async () => {
      // Certains serveurs (JSF) refusent HEAD — retente en GET sans corps.
      return fetch(CNSS_PORTAL_URL, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        next: { revalidate: 3600 },
      })
    })
    clearTimeout(timer)

    const xfo = (res.headers.get('x-frame-options') || '').toLowerCase()
    const csp = (res.headers.get('content-security-policy') || '').toLowerCase()
    const frameAncestors = csp.match(/frame-ancestors\s+([^;]+)/)?.[1]?.trim() ?? ''

    const blockedByXfo = xfo === 'deny' || xfo === 'sameorigin'
    const blockedByCsp = frameAncestors === '' ? false : !/https?:|\*|localhost/i.test(frameAncestors)

    return NextResponse.json(
      { ok: res.ok, embeddable: res.ok && !blockedByXfo && !blockedByCsp, url: CNSS_PORTAL_URL },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    )
  } catch {
    return NextResponse.json({ ok: false, embeddable: false, url: CNSS_PORTAL_URL })
  }
}
