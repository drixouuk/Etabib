/**
 * Mot de passe de secours volontaire sur le compte démo uniquement.
 * Ce compte ne contient que des données synthétiques (profil DrDemo),
 * aucune donnée patient réelle. Ne jamais répliquer sur un autre compte.
 */
import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'
const DEMO_EMAIL = 'drdemo@gmail.com'
const FIXED_PASSWORD = 'demo1234'

const DEMO_ADMIN_KEY = process.env.DEMO_ADMIN_KEY || ''

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== DEMO_ADMIN_KEY) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const apiKey = process.env.INTERNAL_BOOKING_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-internal-api-key': apiKey,
  }

  const findRes = await fetch(`${CMS_URL}/api/users?where[email][equals]=${encodeURIComponent(DEMO_EMAIL)}&limit=1`, { headers })
  if (!findRes.ok) throw new Error('Impossible de trouver le compte démo')
  const findData = await findRes.json()
  const userId = findData?.docs?.[0]?.id
  if (!userId) {
    return NextResponse.json({ error: 'Compte démo introuvable' }, { status: 404 })
  }

  await fetch(`${CMS_URL}/api/users/${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ password: FIXED_PASSWORD }),
  })

  return NextResponse.json({ success: true })
}
