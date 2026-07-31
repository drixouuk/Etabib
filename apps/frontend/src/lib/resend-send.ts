import { Resend } from 'resend'
import { SUPPORT_EMAIL, SITE_DOMAIN } from '@/lib/brand'

/**
 * Envoi d'email transactionnel avec fallback d'expéditeur.
 * Priorité : contact@mail.etabibi.ma (sous-domaine dédié, meilleure délivrabilité).
 * Fallback : contact@etabibi.ma (domaine racine vérifié) si le sous-domaine
 * n'est pas encore actif dans Resend — évite les échecs silencieux.
 */
const FROM_CANDIDATES = [
  `Etabib <${SUPPORT_EMAIL}>`,
  `Etabib <contact@${SITE_DOMAIN}>`,
]

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY manquant')
  return new Resend(key)
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resend = getResend()

  let lastError: { message?: string } | null = null
  for (const from of FROM_CANDIDATES) {
    const { data, error } = await resend.emails.send({ from, to, subject, html })
    if (!error) {
      console.log('[resend] envoyé, id:', data?.id, 'from:', from, 'to:', to)
      return
    }
    lastError = error
    console.error('[resend] échec avec', from, ':', error)
  }
  throw new Error('Échec envoi email : ' + (lastError?.message || 'erreur inconnue'))
}
