'use client'

import { useState, FormEvent } from 'react'

type Props = { userId: string }

export default function ChangePasswordForm({ userId }: Props) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(false)
    if (newPassword.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (newPassword !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setSaving(true)
    const res = await fetch(`/api/cms-proxy/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    if (res.ok) {
      setSuccess(true); setNewPassword(''); setConfirm('')
    } else {
      setError('Erreur lors du changement de mot de passe.')
    }
    setSaving(false)
  }

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3"><h2 className="font-heading text-lg font-semibold text-stone-800">Changer mon mot de passe</h2></div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-800">Nouveau mot de passe</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-800">Confirmer le mot de passe</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputClass} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Mot de passe modifié avec succès.</p>}
        <button type="submit" disabled={saving}
          className="self-start rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  )
}
