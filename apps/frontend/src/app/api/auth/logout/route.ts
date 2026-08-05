import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { authTagForToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('payload-token')?.value
  if (token) {
    // Purge l'entrée users/me de CETTE session dans le Data Cache.
    revalidateTag(authTagForToken(token), 'default')
  }
  // Redirection vers la page de connexion LOCALISÉE : /login nu (sans locale)
  // enchaînait un double redirect POST→307 qui affichait une page vide.
  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'fr'
  const loginUrl = new URL(`/${locale}/login`, request.url)
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
