'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Phone, Mail, Tag, CreditCard } from 'lucide-react'

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'
const labelClass = 'mb-1 block text-sm font-medium text-stone-700'

export default function PracticeEditor() {
  const router = useRouter()
  const [form, setForm] = useState({ address: '', city: '', phone: '', email: '', tagline: '', paymentNote: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [practiceId, setPracticeId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/cms-proxy/practice-info?depth=0&limit=1')
      .then(r => r.json())
      .then(j => {
        const doc = j.docs?.[0]
        if (doc) {
          setPracticeId(doc.id)
          setForm({ address: doc.address || '', city: doc.city || '', phone: doc.phone || '', email: doc.email || '', tagline: doc.tagline || '', paymentNote: doc.paymentNote || '' })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    const url = practiceId ? `/api/cms-proxy/practice-info/${practiceId}` : '/api/cms-proxy/practice-info'
    const method = practiceId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setSuccess(true); router.refresh() }
    else setError("Erreur lors de l'enregistrement")
    setSaving(false)
  }

  if (loading) return <p className="text-sm text-stone-500">Chargement…</p>

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3"><h2 className="font-heading text-lg font-semibold text-stone-800">Cabinet</h2></div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}><MapPin className="mr-1 inline size-3.5" />Adresse</label>
            <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ville</label>
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}><Phone className="mr-1 inline size-3.5" />Téléphone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}><Mail className="mr-1 inline size-3.5" />Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}><Tag className="mr-1 inline size-3.5" />Slogan</label>
            <input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} className={inputClass} placeholder="La santé de vos enfants, entre de bonnes mains" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}><CreditCard className="mr-1 inline size-3.5" />Note paiement</label>
            <input value={form.paymentNote} onChange={e => setForm({ ...form, paymentNote: e.target.value })} className={inputClass} placeholder="Paiement en espèces uniquement" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Enregistré.</p>}
        <button type="submit" disabled={saving} className="self-start rounded-lg bg-cta-600 px-4 py-2 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
          {saving ? '…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
