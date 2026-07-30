import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { storeDemoToken } from '@/lib/demo-tokens'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY manquant')
  return new Resend(key)
}
const DEMO_APPROVE_BASE = process.env.DEMO_APPROVE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://etabibi.ma'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || 'contact@etabibi.ma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })
    }

    const token = randomUUID()
    storeDemoToken(token, email, name)

    await getResend().emails.send({
      from: `Etabib <noreply@${process.env.RESEND_DOMAIN || 'etabibi.ma'}>`,
      to: ADMIN_EMAIL,
      subject: `Demande démo — ${name}`,
      html: `
        <p><strong>${name}</strong> (${email}) demande un accès à la démo.</p>
        ${message ? `<p>Message : ${message}</p>` : ''}
        <p>
          <a href="${DEMO_APPROVE_BASE}/api/demo/approve?token=${token}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}"
             style="display:inline-block;background:#0D9488;color:#fff;padding:10px_20px;border-radius:8px;text-decoration:none;font-weight:bold">
            Approuver l'accès
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:24px">
          Ce lien est valable 48h. Le mot de passe sera envoyé automatiquement au demandeur.
        </p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[demo/request]', err)
    return NextResponse.json({ error: 'Erreur envoi' }, { status: 500 })
  }
}
