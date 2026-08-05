'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const inputClass = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary-500/20'

type Service = { id: string; title: string; icon?: string; order?: number }

export default function ServicesEditor() {
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('')
  const [order, setOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/cms-proxy/services?depth=0&limit=50&sort=order')
    .then(r => r.json()).then(j => setServices(j.docs ?? []))

  useEffect(() => { load() }, [])

  const openNew = () => { setTitle(''); setIcon(''); setOrder(services.length + 1); setEditing(null); setShowForm(true) }
  const openEdit = (s: Service) => { setTitle(s.title); setIcon(s.icon || ''); setOrder(s.order ?? 0); setEditing(s); setShowForm(true) }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const body = { title: title.trim(), icon: icon || undefined, order }
    const url = editing ? `/api/cms-proxy/services/${editing.id}` : '/api/cms-proxy/services'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setShowForm(false); setSaving(false); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce service ?')) return
    await fetch(`/api/cms-proxy/services/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">Services</h2>
        <button onClick={openNew} className="rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cta-700"><Plus className="mr-1 inline size-3.5" />Ajouter</button>
      </div>
      {showForm && (
        <div className="flex flex-col gap-3 border-b border-border bg-muted p-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du service" className={inputClass} />
          <div className="flex gap-3">
            <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Icône (ex: Stethoscope)" className={inputClass} />
            <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} placeholder="Ordre" className={`${inputClass} w-24`} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-cta-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cta-700 disabled:opacity-50">{saving ? '…' : editing ? 'Modifier' : 'Ajouter'}</button>
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Annuler</button>
          </div>
        </div>
      )}
      {services.length === 0 && !showForm && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun service.</p>}
      {services.length > 0 && (
        <div className="divide-y divide-stone-100">
          {services.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.icon && `Icône: ${s.icon}`}{s.order ? ` · Ordre: ${s.order}` : ''}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="rounded p-1 text-muted-foreground hover:text-primary-600"><Pencil className="size-3.5" /></button>
                <button onClick={() => handleDelete(s.id)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
