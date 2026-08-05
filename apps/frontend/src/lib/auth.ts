import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { revalidateTag } from 'next/cache'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

// TTL du profil utilisateur dans le Data Cache Next. Un changement de rôle
// ou de périmètre met jusqu'à ce délai à se propager (voir DECISIONS.md).
const AUTH_TTL = 20

// Tag de cache dérivé du token de session — hash FNV-1a 32 bits, jamais le
// token brut dans une clé ou un tag (évite de fuiter le secret en logs/cache).
export function authTagForToken(token: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `auth:${(h >>> 0).toString(36)}`
}

// Clé de session pour le Data Cache Next : la clé d'entrée du cache est
// l'URL SEULE (les headers Authorization/Cookie n'y entrent PAS — vérifié
// empiriquement : /api/users/me était partagé entre comptes). On rend la
// clé explicitement dépendante de la session via un param _ck dans l'URL,
// dérivé du token (jamais le token brut). Deux sessions → deux clés.
export function sessionCacheKey(token: string): string {
  return authTagForToken(token).replace('auth:', '')
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
