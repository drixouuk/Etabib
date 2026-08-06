import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { revalidateTag } from 'next/cache'
import { createHash } from 'node:crypto'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

// TTL du profil utilisateur dans le Data Cache Next. Un changement de rôle
// ou de périmètre met jusqu'à ce délai à se propager (voir DECISIONS.md).
const AUTH_TTL = 20

// Clé de cache de session — SHA-256 tronqué à 16 hex (source UNIQUE du hash).
// FNV-1a 32 bits retiré : risque de collision inutile pour une clé de cache.
// Jamais le token brut dans une clé, un tag ou un log.
export function sessionCacheKey(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16)
}

// Tag du profil utilisateur (namespace auth:), dérivé de la même clé que le
// _ck — la purge au logout revalide exactement l'entrée de la session.
export function authTagForToken(token: string): string {
  return `auth:${sessionCacheKey(token)}`
}

export type PayloadUser = {
  id: string
  email: string
  name: string
  roles: string[]
  tenant?: string | { id: string }
  doctorProfile?: string | { id: string; name?: string; specialty?: string } | null
  accessExpiresAt?: string | null
}

// Déduplication par requête serveur : requireAuth (layout) + requireTier
// (page) + routes API appellent tous authenticate() — cache() garantit un
// seul users/me réel par requête HTTP. Le fetch est mis en cache 20s par
// session via une clé explicite _ck dans l'URL (la clé du Data Cache
// n'inclut pas les headers — voir sessionCacheKey), taggée par session et
// purgée au logout.
export const authenticate = cache(async (): Promise<PayloadUser | null> => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return null

    const res = await fetch(`${CMS_URL}/api/users/me?_ck=${sessionCacheKey(token)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: { tags: [authTagForToken(token)], revalidate: AUTH_TTL },
    })

    if (!res.ok) return null
    const json = await res.json()
    return json.user ?? null
  } catch {
    return null
  }
})

export async function requireAuth(): Promise<PayloadUser> {
  const user = await authenticate()
  if (!user) {
    redirect('/login')
  }
  if (user.roles?.includes('substitute') && user.accessExpiresAt) {
    if (new Date(user.accessExpiresAt) < new Date()) {
      const cookieStore = await cookies()
      cookieStore.delete('payload-token')
      redirect('/login')
    }
  }
  return user
}
