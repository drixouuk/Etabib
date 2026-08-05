import { cookies } from 'next/headers'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

// TTL par défaut des lectures authentifiées du dashboard. Les écritures
// revalident le tag de collection : l'auteur voit sa donnée instantanément,
// les autres postes restent bornés par ce TTL (voir DECISIONS.md).
const DEFAULT_READ_TTL = 30

// Tag de cache par collection dérivé du chemin (ex. /api/queue-items → col:queue-items).
// La clé d'entrée du Data Cache inclut le header Authorization du fetch :
// chaque compte possède ses propres entrées, jamais partagées (porte d'isolation 8a).
function collectionTag(pathname: string): string | null {
  const m = pathname.match(/\/api\/([a-z0-9-]+)/)
  return m ? `col:${m[1]}` : null
}

async function getToken(): Promise<string | null> {
  const store = await cookies()
  return store.get('payload-token')?.value ?? null
}

export async function fetchCMS<T>(
  path: string,
  options?: { revalidate?: number; cache?: RequestInit['cache']; tags?: string[] },
): Promise<T | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const url = new URL(path.startsWith('http') ? path : `${CMS_URL}${path}`)
    url.searchParams.set('depth', '1')

    const colTag = collectionTag(url.pathname)
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
