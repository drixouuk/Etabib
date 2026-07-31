import { NextRequest, NextResponse } from 'next/server'
import { verifyDemoToken, consumeDemoToken } from '@/lib/demo-tokens'
import { sendEmail } from '@/lib/resend-send'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'
const CMS_API_KEY = process.env.PAYLOAD_API_KEY || ''

const DEMO_EMAIL = 'drdemo@gmail.com'

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const email = req.nextUrl.searchParams.get('email')
  const nameParam = req.nextUrl.searchParams.get('name')

  if (!token || !email) {
    return new Response('Lien invalide', { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const { valid, name: storedName } = verifyDemoToken(token, email)
  if (!valid) {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Lien invalide</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:60px_20px"><h1 style="color:#DC2626">Lien invalide ou expiré</h1><p>Ce lien de validation n'est plus valide. Veuillez refaire une demande.</p></body></html>`
    return new Response(html, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const name = nameParam || storedName || email

  if (!CMS_API_KEY) {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Erreur</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:60px_20px"><h1 style="color:#DC2626">Erreur</h1><p>Configuration serveur incomplète.</p></body></html>`
    return new Response(html, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  try {
    const newPassword = generatePassword()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CMS_API_KEY}`,
    }

    const findRes = await fetch(`${CMS_URL}/api/users?where[email][equals]=${encodeURIComponent(DEMO_EMAIL)}&limit=1`, { headers })
    if (!findRes.ok) throw new Error('Impossible de trouver le compte démo')
    const findData = await findRes.json()
    const userId = findData?.docs?.[0]?.id
    if (!userId) throw new Error('Utilisateur demo introuvable')

    const patchRes = await fetch(`${CMS_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ password: newPassword }),
    })
    if (!patchRes.ok) throw new Error('Échec de la mise à jour du mot de passe')

    consumeDemoToken(token)

    await sendEmail(
      email,
      'Accès démo Etabib',
      `
        <p>Bonjour ${name},</p>
        <p>Votre accès à la démo Etabib a été approuvé.</p>
        <p><strong>Lien :</strong> <a href="https://drdemo.etabibi.ma/login">drdemo.etabibi.ma/login</a></p>
        <p><strong>Email :</strong> ${DEMO_EMAIL}</p>
        <p><strong>Mot de passe :</strong> <span style="font-family:monospace;font-size:18px;background:#f0fdfa;padding:4px_10px;border-radius:6px">${newPassword}</span></p>
        <p style="color:#888;font-size:12px;margin-top:24px">Ce mot de passe est personnel. Il sera renouvelé lors de la prochaine demande.</p>
      `,
    )

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Accès approuvé</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:60px_20px"><h1 style="color:#0D9488">Accès approuvé</h1><p>Les identifiants ont été envoyés à <strong>${email}</strong>.</p></body></html>`
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (err) {
    console.error('[demo/approve]', err)
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Erreur</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:60px_20px"><h1 style="color:#DC2626">Erreur</h1><p>Une erreur est survenue. Veuillez réessayer.</p></body></html>`
    return new Response(html, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}
