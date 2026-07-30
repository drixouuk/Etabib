import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'
const CMS_API_KEY = process.env.PAYLOAD_API_KEY || ''

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY manquant')
  return new Resend(key)
}
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
  const name = req.nextUrl.searchParams.get('name') || email

  if (!token || !email) {
    return new Response('Lien invalide', { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  try {
    const newPassword = generatePassword()

    const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL }),
    })

    let userId: string | null = null
    if (loginRes.ok) {
      const loginData = await loginRes.json()
      userId = loginData?.user?.id || null
    } else {
      const findHeaders: Record<string, string> = {}
      if (CMS_API_KEY) findHeaders['Authorization'] = `Bearer ${CMS_API_KEY}`
      const findRes = await fetch(`${CMS_URL}/api/users?where[email][equals]=${encodeURIComponent(DEMO_EMAIL)}&limit=1`, {
        headers: findHeaders,
      })
      if (findRes.ok) {
        const findData = await findRes.json()
        userId = findData?.docs?.[0]?.id || null
      }
    }

    if (!userId) throw new Error('Utilisateur demo introuvable')

    const tokenRes = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: process.env.DEMO_OLD_PASSWORD || 'demo1234' }),
    })
    const authData = tokenRes.ok ? await tokenRes.json() : null
    const authToken = authData?.token || CMS_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`

    await fetch(`${CMS_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ password: newPassword }),
    })

    await getResend().emails.send({
      from: `Etabib <noreply@${process.env.RESEND_DOMAIN || 'etabibi.ma'}>`,
      to: email,
      subject: 'Accès démo Etabib',
      html: `
        <p>Bonjour ${name},</p>
        <p>Votre accès à la démo Etabib a été approuvé.</p>
        <p><strong>Lien :</strong> <a href="https://drdemo.etabibi.ma/login">drdemo.etabibi.ma/login</a></p>
        <p><strong>Email :</strong> ${DEMO_EMAIL}</p>
        <p><strong>Mot de passe :</strong> <span style="font-family:monospace;font-size:18px;background:#f0fdfa;padding:4px_10px;border-radius:6px">${newPassword}</span></p>
        <p style="color:#888;font-size:12px;margin-top:24px">Ce mot de passe est personnel. Il sera renouvelé lors de la prochaine demande.</p>
      `,
    })

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Accès approuvé</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:60px_20px"><h1 style="color:#0D9488">Accès approuvé</h1><p>Les identifiants ont été envoyés à <strong>${email}</strong>.</p></body></html>`
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (err) {
    console.error('[demo/approve]', err)
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Erreur</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:60px_20px"><h1 style="color:#DC2626">Erreur</h1><p>Une erreur est survenue. Veuillez réessayer.</p></body></html>`
    return new Response(html, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}
