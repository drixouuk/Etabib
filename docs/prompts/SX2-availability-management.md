# LOT SX-2 — Gestion des disponibilités

## Contexte

- Phase 1 déployée : l'agenda Schedule-X remplace Cal.com. Les RDV sont créés via notre API.
- Problème : n'importe quel créneau est réservable. Le médecin ne peut pas définir ses horaires.
- Besoin : une UI dans `/dashboard/settings/availability` pour gérer les plages de disponibilité.

---

## Étape 1 — Collection CMS `availability-slots`

**Fichier à créer** : `apps/cms/src/collections/AvailabilitySlots.ts`

```typescript
import type { CollectionConfig } from 'payload'

export const AvailabilitySlots: CollectionConfig = {
  slug: 'availability-slots',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['doctor', 'dayOfWeek', 'startTime', 'endTime'],
    group: 'Cabinet',
  },
  access: {
    read: ({ req: { user } }: any) => {
      if (user?.roles?.includes('superadmin')) return true
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    create: ({ req: { user } }: any): boolean => {
      const roles = user?.roles ?? []
      return roles.includes('superadmin') || roles.includes('tenant_admin') || roles.includes('doctor')
    },
    update: ({ req: { user } }: any) => {
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
    delete: ({ req: { user } }: any) => {
      const tid = typeof user?.tenant === 'object' ? user.tenant.id : user?.tenant
      if (!tid) return false
      return { tenant: { equals: tid } }
    },
  },
  hooks: {
    beforeChange: [
      ({ req, data, operation }: any) => {
        if (operation === 'create' && req.user?.tenant) {
          data.tenant = typeof req.user.tenant === 'object' ? req.user.tenant.id : req.user.tenant
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, admin: { readOnly: true } },
    {
      name: 'doctor',
      type: 'relationship',
      relationTo: 'doctors',
      label: 'Médecin (optionnel, pour tier clinique)',
    },
    {
      name: 'dayOfWeek',
      type: 'select',
      required: true,
      options: [
        { label: 'Lundi', value: '1' },
        { label: 'Mardi', value: '2' },
        { label: 'Mercredi', value: '3' },
        { label: 'Jeudi', value: '4' },
        { label: 'Vendredi', value: '5' },
        { label: 'Samedi', value: '6' },
        { label: 'Dimanche', value: '0' },
      ],
      label: 'Jour',
    },
    { name: 'startTime', type: 'text', required: true, label: 'Début (HH:MM)' },
    { name: 'endTime', type: 'text', required: true, label: 'Fin (HH:MM)' },
    { name: 'durationMinutes', type: 'number', required: true, label: 'Durée consultation (min)', defaultValue: 30, min: 15, max: 120 },
    { name: 'bufferMinutes', type: 'number', label: 'Pause entre RDV (min)', defaultValue: 15, min: 0, max: 60 },
    { name: 'isActive', type: 'checkbox', label: 'Actif', defaultValue: true },
  ],
}
```

Enregistrer dans `payload.config.ts`. **Migration obligatoire.**

## Étape 2 — UI AvailabilityManager dans Settings

**Fichier à créer** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/AvailabilityManager.tsx`

Composant client avec CRUD des plages :

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Slot = {
  id: string; dayOfWeek: string; startTime: string; endTime: string
  durationMinutes: number; bufferMinutes: number; isActive: boolean
}

const DAY_LABELS: Record<string, string> = { '1':'Lundi','2':'Mardi','3':'Mercredi','4':'Jeudi','5':'Vendredi','6':'Samedi','0':'Dimanche' }

export default function AvailabilityManager() {
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Slot | null>(null)
  // form state
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [bufferMinutes, setBufferMinutes] = useState(15)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSlots = () => {
    fetch('/api/cms-proxy/availability-slots?depth=0&limit=50')
      .then(r => r.json()).then(j => setSlots(j.docs ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { fetchSlots() }, [])

  const openNew = () => { resetForm(); setEditing(null); setShowForm(true) }
  const openEdit = (s: Slot) => { setDayOfWeek(s.dayOfWeek); setStartTime(s.startTime); setEndTime(s.endTime); setDurationMinutes(s.durationMinutes); setBufferMinutes(s.bufferMinutes); setIsActive(s.isActive); setEditing(s); setShowForm(true) }
  const resetForm = () => { setDayOfWeek('1'); setStartTime('09:00'); setEndTime('17:00'); setDurationMinutes(30); setBufferMinutes(15); setIsActive(true) }

  const handleSave = async () => {
    setSaving(true)
    const body = { dayOfWeek, startTime, endTime, durationMinutes, bufferMinutes, isActive }
    const url = editing ? `/api/cms-proxy/availability-slots/${editing.id}` : '/api/cms-proxy/availability-slots'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setShowForm(false); fetchSlots(); router.refresh()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette plage ?')) return
    await fetch(`/api/cms-proxy/availability-slots/${id}`, { method: 'DELETE' })
    fetchSlots(); router.refresh()
  }

  if (loading) return <p className="text-sm text-ink-soft">Chargement…</p>

  return (
    <div className="rounded-xl border border-warm bg-white shadow-warm-sm">
      <div className="flex items-center justify-between border-b border-warm px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-ink">Disponibilités</h2>
        <button onClick={openNew} className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800">+ Ajouter</button>
      </div>
      {showForm && (
        <div className="border-b border-warm bg-stone-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} className="rounded-lg border border-warm bg-white px-3 py-2 text-sm">
              {Object.entries(DAY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="rounded-lg border border-warm bg-white px-3 py-2 text-sm" />
              <span className="text-ink-soft">→</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="rounded-lg border border-warm bg-white px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-soft">Durée (min)</label>
              <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} min={15} max={120} className="w-full rounded-lg border border-warm bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-ink-soft">Pause (min)</label>
              <input type="number" value={bufferMinutes} onChange={e => setBufferMinutes(Number(e.target.value))} min={0} max={60} className="w-full rounded-lg border border-warm bg-white px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Actif
          </label>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary-700 px-4 py-1.5 text-xs font-medium text-white">Enregistrer</button>
            <button onClick={() => setShowForm(false)} className="text-xs text-ink-soft">Annuler</button>
          </div>
        </div>
      )}
      {slots.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-soft">Aucune plage de disponibilité.</p>
      ) : (
        <div className="divide-y divide-warm">
          {slots.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{DAY_LABELS[s.dayOfWeek]} · {s.startTime}–{s.endTime}</p>
                <p className="text-xs text-ink-soft">{s.durationMinutes}min · pause {s.bufferMinutes}min {!s.isActive && '· Inactive'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className="rounded p-1 text-ink-soft hover:text-primary-600"><Pencil className="size-3.5" /></button>
                <button onClick={() => handleDelete(s.id)} className="rounded p-1 text-ink-soft hover:text-red-600"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## Étape 3 — Intégrer dans Settings

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx`

Ajouter `import AvailabilityManager from './AvailabilityManager'` et le composant dans le JSX (après ReferringPractitionersManager).

## Étape 4 — Filtrer les créneaux réservables

**Fichier** : `apps/frontend/src/app/api/bookings/route.ts`

Avant de créer un booking, vérifier que le créneau est dans une plage de disponibilité active :

```typescript
// Vérifier que le créneau est dans une plage active
const dayOfWeek = String(slotDate.getDay())
const timeStr = `${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`
const slotsCheck = await fetch(
  `${CMS_URL}/api/availability-slots?where[tenant][equals]=${tenantId}&where[dayOfWeek][equals]=${dayOfWeek}&where[isActive][equals]=true&where[startTime][less_than_equal]=${timeStr}&where[endTime][greater_than]=${timeStr}&depth=0&limit=1`
)
const slots = await slotsCheck.json()
if (!slots.docs?.length) {
  return NextResponse.json({ error: 'Créneau hors plage de disponibilité' }, { status: 400 })
}
```

## Fichiers Phase 2

| Action | Fichier |
|--------|---------|
| Créer | `apps/cms/src/collections/AvailabilitySlots.ts` |
| Modifier | `apps/cms/src/payload.config.ts` |
| Créer | `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/AvailabilityManager.tsx` |
| Modifier | `apps/frontend/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx` |
| Modifier | `apps/frontend/src/app/api/bookings/route.ts` (vérif plage) |
