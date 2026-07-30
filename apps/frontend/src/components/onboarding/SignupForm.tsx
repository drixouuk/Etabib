'use client'

import { useState, FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

import { SITE_DOMAIN } from '@/lib/brand'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_ONBOARDING_BASE_DOMAIN || `.${SITE_DOMAIN}`

type Props = {
  tier: 'vitrine' | 'rdv' | 'cabinet'
  specialty?: string
  doctorCount?: number
  onSuccess: (data: { domain: string; email: string }) => void
  onBack: () => void
}

type FieldErrors = {
  name?: string
  fullName?: string
  email?: string
  password?: string
  subdomain?: string
}

export default function SignupForm({ tier, specialty, doctorCount, onSuccess, onBack }: Props) {
  const [form, setForm] = useState({
    name: '',
    fullName: '',
    email: '',
    password: '',
    subdomain: '',
    phone: '',

  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [saving, setSaving] = useState(false)
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle')

  const checkSubdomain = async (value: string) => {
    if (value.length < 3) { setSubdomainStatus('idle'); return }
    setSubdomainStatus('checking')
    try {
      const res = await fetch(`/api/onboarding/check-subdomain?domain=${encodeURIComponent(value)}`)
      const { available } = await res.json()
      setSubdomainStatus(available ? 'available' : 'unavailable')
    } catch { setSubdomainStatus('idle') }
  }

  const validate = (): boolean => {
    const e: FieldErrors = {}
    if (!form.name.trim()) e.name = 'Nom du cabinet requis'
    if (!form.fullName.trim()) e.fullName = 'Votre nom requis'
    if (!form.email.trim()) e.email = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    if (!form.password) e.password = 'Mot de passe requis'
    else if (form.password.length < 8) e.password = 'Minimum 8 caractères'
    if (!form.subdomain.trim()) e.subdomain = 'Sous-domaine requis'
    else if (form.subdomain.length < 3) e.subdomain = 'Minimum 3 caractères'
    else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(form.subdomain))
      e.subdomain = 'Lettres, chiffres et tirets uniquement'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setSaving(true)
    const domain = `${form.subdomain}${BASE_DOMAIN}`
    const body: Record<string, unknown> = {
      domain,
      name: form.name,
      email: form.email,
      password: form.password,
      tier,
      phone: form.phone || undefined,
      fullName: form.fullName,
    }
    if (specialty) body.specialty = specialty
    if (doctorCount !== undefined) body.doctorCount = doctorCount

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg =
          data?.error?.includes('domaine')
            ? 'Ce nom de domaine est déjà pris. Choisissez-en un autre.'
            : data?.error?.includes('tenant')
              ? 'Une erreur est survenue lors de la création de votre cabinet. Veuillez réessayer.'
              : data?.error || 'Une erreur est survenue. Veuillez réessayer.'
        setApiError(msg)
        setSaving(false)
        return
      }
      onSuccess({ domain, email: form.email })
    } catch {
      setApiError('Impossible de contacter le serveur. Vérifiez votre connexion.')
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors duration-200'

  const labelClass = 'mb-1 block text-sm font-medium text-stone-700'

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <div>
        <label htmlFor="onb-name" className={labelClass}>Nom du cabinet *</label>
        <input id="onb-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        {errors.name && <p className="mt-0.5 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="onb-fullName" className={labelClass}>Votre nom *</label>
        <input id="onb-fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} />
        {errors.fullName && <p className="mt-0.5 text-xs text-red-500">{errors.fullName}</p>}
      </div>

      <div>
        <label htmlFor="onb-email" className={labelClass}>Email *</label>
        <input id="onb-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
        {errors.email && <p className="mt-0.5 text-xs text-red-500">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="onb-password" className={labelClass}>Mot de passe *</label>
        <input id="onb-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
        {errors.password && <p className="mt-0.5 text-xs text-red-500">{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="onb-subdomain" className={labelClass}>
          Sous-domaine * <span className="text-stone-400 font-normal">{BASE_DOMAIN}</span>
        </label>
        <div className="flex items-center gap-2">
          <input id="onb-subdomain" value={form.subdomain} onChange={(e) => { setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }); setSubdomainStatus('idle') }} onBlur={() => checkSubdomain(form.subdomain)} className={inputClass} placeholder="mon-cabinet" />
          <span className="whitespace-nowrap text-sm text-stone-500">{BASE_DOMAIN}</span>
        </div>
        {errors.subdomain && <p className="mt-0.5 text-xs text-red-500">{errors.subdomain}</p>}
        {subdomainStatus === 'checking' && <p className="mt-0.5 text-xs text-stone-500">Vérification…</p>}
        {subdomainStatus === 'available' && <p className="mt-0.5 text-xs text-green-600">Disponible ✓</p>}
        {subdomainStatus === 'unavailable' && <p className="mt-0.5 text-xs text-red-500">Indisponible</p>}
      </div>

      <div>
        <label htmlFor="onb-phone" className={labelClass}>Téléphone <span className="text-stone-400 font-normal">(optionnel)</span></label>
        <input id="onb-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
      </div>



      {apiError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{apiError}</div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onBack} className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors duration-200">
          Retour
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50 transition-colors duration-200"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Créer mon compte
        </button>
      </div>
    </form>
  )
}
