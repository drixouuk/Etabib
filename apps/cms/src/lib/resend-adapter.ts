import type { EmailAdapter, SendEmailOptions } from 'payload'

/**
 * Adaptateur email Payload → API Resend (fetch direct, zéro dépendance).
 * Le CMS n'a pas d'adaptateur dans son arbre npm ; l'API REST de Resend
 * suffit : POST https://api.resend.com/emails avec le Bearer key.
 */
export const resendAdapter = (opts: { apiKey: string; fromAddress: string; fromName: string }): EmailAdapter =>
  ({ payload }) => ({
    name: 'resend',
    defaultFromAddress: opts.fromAddress,
    defaultFromName: opts.fromName,
    sendEmail: async (message: SendEmailOptions) => {
      const to = Array.isArray(message.to) ? message.to.filter(Boolean) : [message.to]
      if (to.length === 0) return null
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${opts.fromName} <${opts.fromAddress}>`,
          to,
          subject: message.subject,
          html: message.html || message.text,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`)
      }
      return res.json()
    },
  })
