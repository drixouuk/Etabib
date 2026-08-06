'use client'

import { useState, FormEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`${process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    if (res.ok) router.push('/fr/login?reset=true')
    else setError('Token invalide ou expiré')
    setSaving(false)
  }

  if (!token) return <p className="mt-16 text-center text-stone-600">Lien invalide.</p>

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <div className="w-full">
        <h1 className="font-heading text-2xl font-bold text-stone-800">Nouveau mot de passe</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe" required minLength={8}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmer le mot de passe" required
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
            {saving ? '…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
