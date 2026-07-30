'use client'

import { useState, FormEvent } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const res = await fetch(`${process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) setSent(true)
    else setError('Email introuvable')
    setSending(false)
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <div className="w-full">
        <h1 className="font-heading text-2xl font-bold text-stone-800">Mot de passe oublié</h1>
        {sent ? (
          <p className="mt-4 text-stone-600">Si ce compte existe, un email de réinitialisation vous a été envoyé.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Votre email" required
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={sending}
              className="w-full rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {sending ? '…' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
