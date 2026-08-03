import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { storeDemoToken } from '@/lib/demo-tokens'
import { ADMIN_EMAIL } from '@/lib/brand'
import { sendEmail } from '@/lib/resend-send'
import { verifyTurnstile, clientRemoteIp } from '@/lib/turnstile'

const DEMO_APPROVE_BASE = process.env.DEMO_APPROVE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://etabibi.ma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, 'cf-turnstile-response': turnstileToken } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })
    }

    if (!(await verifyTurnstile(turnstileToken, clientRemoteIp(req)))) {
      return NextResponse.json({ error: 'Vérification anti-bot échouée' }, { status: 403 })
    }

    const token = randomUUID()
    storeDemoToken(token, email, name)

    await sendEmail(
      ADMIN_EMAIL,
      `Demande démo — ${name}`,
      `
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
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[demo/request]', err)
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur envoi : ' + msg }, { status: 500 })
  }
}
