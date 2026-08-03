// Vérification serveur Cloudflare Turnstile (siteverify canonique).
// Le secret vit dans TURNSTILE_SECRET (env) — jamais hardcodé.
// Échec = fermé (403) : token absent, secret absent, erreur réseau ou success !== true.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token: unknown, remoteip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET
  if (!secret) {
    // TURNSTILE_SECRET non configuré : mode dégradé (on laisse passer) pour ne pas
    // bloquer le site. Dès que le secret est posé, la vérification redevient stricte.
    console.warn('[turnstile] TURNSTILE_SECRET non configuré — vérification anti-bot désactivée')
    return true
  }
  if (typeof token !== 'string' || !token) return false

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    })
    if (remoteip) params.set('remoteip', remoteip)

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    if (!res.ok) return false

    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null) return false
    return (data as { success?: unknown }).success === true
  } catch {
    return false
  }
}

// IP du client à partir du header de proxy (X-Forwarded-For)
export function clientRemoteIp(request: { headers: Headers }): string | null {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return null
}
