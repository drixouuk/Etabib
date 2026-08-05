'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Link } from '@/i18n/navigation'

type Props = {
  patient: {
    id: string
    fullName: string
    gender?: string | null
    birthDate?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    nationalId?: string | null
    patientSource?: string | null
    patientSourceDetail?: string | null
    referringPractitioners?: (string | { id: string })[]
  }
}

export default function EditPatientForm({ patient }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(patient.fullName)
  const [gender, setGender] = useState(patient.gender || '')
  const [birthDate, setBirthDate] = useState(
    patient.birthDate ? patient.birthDate.slice(0, 10) : '',
  )
  const [address, setAddress] = useState(patient.address || '')
  const [phone, setPhone] = useState(patient.phone || '')
  const [email, setEmail] = useState(patient.email || '')
  const [nationalId, setNationalId] = useState(patient.nationalId || '')
  const [patientSource, setPatientSource] = useState(patient.patientSource || '')
  const [patientSourceDetail, setPatientSourceDetail] = useState(patient.patientSourceDetail || '')
  const [referringIds, setReferringIds] = useState<string[]>(
    patient.referringPractitioners ? (patient.referringPractitioners as any[]).map((r: any) => typeof r === 'object' ? r.id : r) : [],
  )
  const [referringOptions, setReferringOptions] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    fetch('/api/cms-proxy/referring-practitioners?depth=0&limit=200')
      .then(r => r.json()).then(j => setReferringOptions(j.docs ?? []))
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const body: Record<string, unknown> = {
      fullName,
      gender,
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      nationalId: nationalId || undefined,
      birthDate: birthDate || undefined,
      patientSource: patientSource || undefined,
      patientSourceDetail: patientSourceDetail || undefined,
      referringPractitioners: referringIds.length > 0 ? referringIds : undefined,
    }

    const res = await fetch(`/api/cms-proxy/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || 'Erreur lors de la modification')
      setSaving(false)
      return
    }

    router.push(`/dashboard/patients/${patient.id}`)
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary-500/20'

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-foreground">
          Nom complet *
        </label>
        <input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          type="text"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="gender" className="mb-1 block text-sm font-medium text-foreground">
          Sexe *
        </label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
          className={inputClass}
        >
          <option value="">Sélectionner…</option>
          <option value="boy">Garçon</option>
          <option value="girl">Fille</option>
        </select>
      </div>

      <div>
        <label htmlFor="birthDate" className="mb-1 block text-sm font-medium text-foreground">
          Date de naissance
        </label>
        <input
          id="birthDate"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          type="date"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-foreground">
          Adresse
        </label>
        <input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          type="text"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">
          Téléphone
        </label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="nationalId" className="mb-1 block text-sm font-medium text-foreground">CIN (optionnel)</label>
        <input id="nationalId" value={nationalId} onChange={e => setNationalId(e.target.value)} type="text" className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Provenance</label>
        <select value={patientSource} onChange={e => setPatientSource(e.target.value)} className={inputClass}>
          <option value="">Non renseigné</option>
          <option value="referring_practitioner">Médecin référent</option>
          <option value="google">Google</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="autre_patient">Recommandé par un autre patient</option>
          <option value="connaissance">Connaissance / Bouche-à-oreille</option>
          <option value="professionnel_sante">Professionnel de santé</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      {patientSource === 'referring_practitioner' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Médecin référent</label>
          <select value={referringIds[0] || ''} onChange={e => setReferringIds(e.target.value ? [e.target.value] : [])} className={inputClass}>
            <option value="">Sélectionner…</option>
            {referringOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Détail <span className="text-muted-foreground font-normal">(optionnel)</span></label>
        <input value={patientSourceDetail} onChange={e => setPatientSourceDetail(e.target.value)} type="text" placeholder="Ex: Groupe Facebook..." className={inputClass} />
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-cta-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        <Link
          href={`/dashboard/patients/${patient.id}`}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Annuler
        </Link>
      </div>
    </form>
  )
}
