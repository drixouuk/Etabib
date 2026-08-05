import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { authTagForToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('payload-token')?.value
  if (token) {
    // Purge l'entrée users/me de CETTE session dans le Data Cache.
    revalidateTag(authTagForToken(token), 'default')
  }
  // Redirection vers la page de connexion LOCALISÉE sur le domaine PUBLIC :
  // request.url porte le hostname interne du reverse proxy (ex. localhost:3000
  // dans le conteneur) — on reconstruit l'origin depuis les headers forwards
  // (même logique que proxy.ts). En production l'entrée publique est toujours
  // TLS : x-forwarded-proto peut arriver en http selon la chaîne de proxy,
  // on force https pour ne jamais renvoyer vers une page non chiffrée.
  const forwardedHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim()
  const forwardedProto = process.env.NODE_ENV === 'production' ? 'https' : (request.headers.get('x-forwarded-proto') || 'https')
  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'fr'
  const loginUrl = new URL(`/${locale}/login`, `${forwardedProto}://${forwardedHost}`)
  const response = NextResponse.redirect(loginUrl)
  response.cookies.set('payload-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
