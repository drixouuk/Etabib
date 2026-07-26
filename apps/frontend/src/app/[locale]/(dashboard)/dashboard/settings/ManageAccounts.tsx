'use client'

import { useState } from 'react'

type User = { id: string; email: string; name: string; roles: string[] }

type Props = { users: User[]; currentUserId: string }

const roleLabels: Record<string, string> = {
  superadmin: 'Super admin', tenant_admin: 'Admin', doctor: 'Médecin', secretary: 'Secrétaire', substitute: 'Remplaçant',
}

function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [showForm, setShowForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleReset = async () => {
    if (newPassword.length < 8) { setError('Minimum 8 caractères'); return }
    setSaving(true); setError('')
    const res = await fetch(`/api/cms-proxy/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    })
    if (res.ok) { setDone(true); setShowForm(false); setNewPassword(''); setTimeout(() => setDone(false), 3000) }
    else { setError('Erreur lors du changement de mot de passe.') }
    setSaving(false)
  }

  if (showForm) return (
    <div className="flex items-center gap-2">
      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
        placeholder="Nouveau MDP" minLength={8}
        className="w-36 rounded-lg border border-warm bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none" />
      <button onClick={handleReset} disabled={saving}
        className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50">OK</button>
      <button onClick={() => setShowForm(false)} className="text-sm text-ink-softer hover:text-stone-600">✕</button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      {done && <span className="text-xs text-green-600">Modifié ✓</span>}
      <button onClick={() => setShowForm(true)}
        className="text-sm font-medium text-primary-600 hover:text-primary-700">Réinitialiser MDP</button>
    </div>
  )
}

export default function ManageAccounts({ users, currentUserId }: Props) {
  return (
    <div className="rounded-xl border border-warm bg-white shadow-warm-sm">
      <div className="border-b border-stone-100 px-4 py-3"><h2 className="font-heading text-lg font-semibold text-ink">Comptes du cabinet</h2></div>
      {users.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-softer">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {u.name || u.email}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-ink-softer">(vous)</span>}
                </p>
                <p className="text-xs text-ink-soft">{u.email} — {u.roles.map(r => roleLabels[r] || r).join(', ')}</p>
              </div>
              <ResetPasswordButton userId={u.id} userName={u.name || u.email} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
