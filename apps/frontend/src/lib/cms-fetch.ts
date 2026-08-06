import { cookies } from 'next/headers'
import { sessionCacheKey } from './auth'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

// TTL par défaut des lectures authentifiées du dashboard. Les écritures
// revalident le tag de collection : l'auteur voit sa donnée instantanément,
// les autres postes restent bornés par ce TTL (voir DECISIONS.md).
const DEFAULT_READ_TTL = 30

// Tag de cache par collection dérivé du chemin (ex. /api/queue-items → col:queue-items),
// scopé par tenant quand il est connu : une écriture chez un tenant ne
// réinvalide pas le cache des autres tenants (sur-invalidation évitée).
// Sans tenant connu (URL sans filtre tenant, ex. détail patient), le tag
// global col:{collection} est conservé — ces entrées vivent leur TTL.
// ISOLATION : la clé d'entrée du Data Cache Next est l'URL SEULE — les
// headers Authorization n'en font pas partie (vérifié en prod : users/me
// était partagé entre comptes). On injecte un param _ck dérivé du token
// dans l'URL pour rendre chaque entrée propre à une session (porte
// d'isolation 8a, clé explicite).
function collectionTag(pathname: string, tenantId?: string): string | null {
  const m = pathname.match(/\/api\/([a-z0-9-]+)/)
  if (!m) return null
  return tenantId ? `col:${m[1]}:tenant:${tenantId}` : `col:${m[1]}`
}

async function getToken(): Promise<string | null> {
  const store = await cookies()
  return store.get('payload-token')?.value ?? null
}

export async function fetchCMS<T>(
  path: string,
  options?: { revalidate?: number; cache?: RequestInit['cache']; tags?: string[]; tenantId?: string },
): Promise<T | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const url = new URL(path.startsWith('http') ? path : `${CMS_URL}${path}`)
    url.searchParams.set('depth', '1')
    url.searchParams.set('_ck', sessionCacheKey(token))

    const tenantId = options?.tenantId ?? url.searchParams.get('where[tenant][equals]') ?? undefined
    const colTag = collectionTag(url.pathname, tenantId)
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: options?.revalidate ?? DEFAULT_READ_TTL,
        tags: options?.tags ?? (colTag ? [colTag] : []),
      },
      cache: options?.cache,
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function postCMS<T>(path: string, data: unknown): Promise<T | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function patchCMS<T>(path: string, data: unknown): Promise<T | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
