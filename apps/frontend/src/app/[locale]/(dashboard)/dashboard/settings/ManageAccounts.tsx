'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

type User = { id: string; email: string; name: string; roles: string[] }

type Props = { users: User[]; currentUserId: string; isAdmin?: boolean }

const roleLabels: Record<string, string> = {
  superadmin: 'Super admin', tenant_admin: 'Admin', doctor: 'Médecin', secretary: 'Secrétaire', substitute: 'Remplaçant',
}

function roleBadge(roles: string[]): { label: string; className: string } {
  if (roles.includes('superadmin') || roles.includes('tenant_admin')) {
    return { label: 'Médecin · Admin', className: 'bg-primary-50 text-primary-700' }
  }
  if (roles.includes('doctor')) return { label: 'Médecin', className: 'bg-primary-50 text-primary-700' }
  if (roles.includes('secretary')) return { label: 'Secrétaire', className: 'bg-warning/10 text-warning' }
  return { label: roles.map((r) => roleLabels[r] || r).join(', '), className: 'bg-stone-100 text-stone-600' }
}

function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase()
}

function ResetPasswordButton({ userId }: { userId: string }) {
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
      <button onClick={() => setShowForm(false)} className="text-sm text-stone-600 hover:text-stone-600">✕</button>
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

export default function ManageAccounts({ users, currentUserId, isAdmin = true }: Props) {
  const router = useRouter()
  const [tenantId, setTenantId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'secretary', accessExpiresAt: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/cms-proxy/tenants?depth=0&limit=1')
      .then(r => r.json())
      .then(j => {
        const doc = j.docs?.[0]
        if (doc?.id) setTenantId(doc.id)
      })
      .catch(() => {})
  }, [])

  const handleCreate = async () => {
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Nom, email et mot de passe requis'); return
    }
    if (form.password.length < 8) { setError('Mot de passe : minimum 8 caractères'); return }
    if (form.role === 'substitute' && !form.accessExpiresAt) {
      setError("Date d'expiration requise pour un remplaçant"); return
    }
    setSaving(true)
    const body: Record<string, unknown> = {
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim(),
      roles: [form.role],
      tenant: tenantId,
    }
    if (form.role === 'substitute') body.accessExpiresAt = new Date(form.accessExpiresAt).toISOString()

    const res = await fetch('/api/cms-proxy/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ name: '', email: '', role: 'secretary', accessExpiresAt: '', password: '' })
      router.refresh()
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.errors?.[0]?.message || "Erreur lors de la création du compte")
    }
    setSaving(false)
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`Supprimer le compte de ${u.name || u.email} ?`)) return
    setDeleting(true)
    await fetch(`/api/cms-proxy/users/${u.id}`, { method: 'DELETE' })
    setDeleting(false)
    router.refresh()
  }

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'
  const labelClass = 'mb-0.5 block text-xs text-stone-600'

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Comptes du cabinet</h2>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700">
            <Plus className="mr-1 inline size-3.5" />Ajouter un compte
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <div className="border-b border-stone-100 bg-stone-50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nom complet *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rôle *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputClass}>
                <option value="secretary">Secrétaire</option>
                <option value="substitute">Remplaçant</option>
              </select>
            </div>
            {form.role === 'substitute' && (
              <div>
                <label className={labelClass}>Date d&apos;expiration *</label>
                <input type="date" value={form.accessExpiresAt} onChange={e => setForm({ ...form, accessExpiresAt: e.target.value })} className={inputClass} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={labelClass}>Mot de passe temporaire * (min 8 caractères)</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputClass} />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleCreate} disabled={saving}
              className="rounded-lg bg-cta-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50">
              {saving ? '…' : 'Créer le compte'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-stone-600 hover:text-stone-800">Annuler</button>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-stone-500">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {users.map((u) => {
            const badge = roleBadge(u.roles)
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">
                  {initialsOf(u.name || u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-stone-800">
                    {u.name || u.email}
                    {u.id === currentUserId && <span className="ml-2 text-xs font-normal text-stone-600">(vous)</span>}
                  </p>
                  <p className="truncate text-xs text-stone-500">{u.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <ResetPasswordButton userId={u.id} />
                  {isAdmin && u.id !== currentUserId && (
                    <button onClick={() => handleDelete(u)} disabled={deleting}
                      className="rounded p-1 text-stone-500 hover:text-red-600 transition-colors" title="Supprimer ce compte">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
