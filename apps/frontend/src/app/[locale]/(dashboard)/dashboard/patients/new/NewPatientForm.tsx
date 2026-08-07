'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPatientForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [addToQueue, setAddToQueue] = useState(true)
  const [patientSource, setPatientSource] = useState('')
  const [patientSourceDetail, setPatientSourceDetail] = useState('')
  const [referringIds, setReferringIds] = useState<string[]>([])
  const [referringOptions, setReferringOptions] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    fetch('/api/cms-proxy/referring-practitioners?depth=0&limit=200')
      .then(r => r.json()).then(j => setReferringOptions(j.docs ?? []))
  }, [])

  const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const body: Record<string, unknown> = {
      fullName,
      gender,
      birthDate: birthDate || undefined,
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      nationalId: nationalId || undefined,
      patientSource: patientSource || undefined,
      patientSourceDetail: patientSourceDetail || undefined,
      referringPractitioners: referringIds.length > 0 ? referringIds : undefined,
    }

    const res = await fetch('/api/cms-proxy/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      setError('Erreur lors de la création')
      setSaving(false)
      return
    }

    const newPatient = await res.json()

    if (addToQueue && newPatient?.doc?.id) {
      await fetch('/api/cms-proxy/queue-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: newPatient.doc.id,
          status: 'waiting',
          visitReason: 'consultation',
          arrivalTime: new Date().toISOString(),
        }),
      })
    }

    router.push('./')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 lg:px-8">
      <h1 className="font-heading text-[27px] font-bold tracking-tight text-stone-800">Nouveau patient</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-stone-800">
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
          <label htmlFor="gender" className="mb-1 block text-sm font-medium text-stone-800">
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
          <label htmlFor="birthDate" className="mb-1 block text-sm font-medium text-stone-800">
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
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-stone-800">
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
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-stone-800">
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
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-800">
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
          <label htmlFor="nationalId" className="mb-1 block text-sm font-medium text-stone-800">
            CIN (optionnel)
          </label>
          <input
            id="nationalId"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            type="text"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-800">Provenance</label>
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
            <label className="mb-1 block text-sm font-medium text-stone-800">Médecin référent</label>
            <select value={referringIds[0] || ''} onChange={e => setReferringIds(e.target.value ? [e.target.value] : [])} className={inputClass}>
              <option value="">Sélectionner…</option>
              {referringOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-800">Détail <span className="text-stone-600 font-normal">(optionnel)</span></label>
          <input value={patientSourceDetail} onChange={e => setPatientSourceDetail(e.target.value)} type="text" placeholder="Ex: Groupe Facebook mamans Agadir, Dr. Martin..." className={inputClass} />
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={addToQueue}
            onChange={(e) => setAddToQueue(e.target.checked)}
            className="size-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500/20"
          />
          Ajouter à la file d'attente du jour
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-lg bg-cta-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50"
        >
          {saving ? 'Création…' : 'Créer le patient'}
        </button>
      </form>
    </div>
  )
}
