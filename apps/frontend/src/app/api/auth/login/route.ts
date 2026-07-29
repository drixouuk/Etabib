import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const res = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    const json = await res.json()
    const user = json.user

    if (user?.roles?.includes('substitute') && user?.accessExpiresAt) {
      const expiresAt = new Date(user.accessExpiresAt)
      if (expiresAt < new Date()) {
        const dateStr = expiresAt.toLocaleDateString('fr-FR')
        return NextResponse.json(
          { error: `Votre accès remplaçant a expiré le ${dateStr}. Contactez le médecin titulaire.` },
          { status: 403 },
        )
      }
    }

    const response = NextResponse.json({ success: true, user: json.user })
    response.cookies.set('payload-token', json.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
