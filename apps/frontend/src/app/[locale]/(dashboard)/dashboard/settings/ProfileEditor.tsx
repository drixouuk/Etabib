'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Props = { userId: string; initialName: string; initialEmail: string; initialPhone: string }

export default function ProfileEditor({ userId, initialName, initialEmail, initialPhone }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(false)
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email invalide.'); return }
    setSaving(true)

    const userRes = await fetch(`/api/cms-proxy/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    })
    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}))
      setError(errData?.errors?.[0]?.message || 'Erreur lors de la mise à jour du profil.')
      setSaving(false); return
    }

    const phoneRes = await fetch('/api/cms-proxy/globals/practice-info', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    })
    if (!phoneRes.ok) { setError('Profil mis à jour, mais erreur sur le téléphone.'); setSaving(false); return }

    setSuccess(true); setSaving(false); router.refresh()
  }

  const inputClass = 'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary-500/20'

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3"><h2 className="font-heading text-lg font-semibold text-foreground">Mon profil</h2></div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Nom</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Téléphone professionnel</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+212 ..." />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-success">Profil mis à jour avec succès.</p>}
        <button type="submit" disabled={saving}
          className="self-start rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}
