'use client'

import { useState, useEffect } from 'react'

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none'

export default function CalendarSettings() {
  const [domain, setDomain] = useState('')
  const [icalUrl, setIcalUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cms-proxy/tenants?depth=0&limit=1')
      .then(r => r.json())
      .then(j => {
        const doc = j.docs?.[0]
        const d = doc?.domain?.split('.')[0] || ''
        const token = doc?.settings?.calendarToken || ''
        setDomain(d)
        if (d && token) setIcalUrl(`https://etabibi.ma/api/calendar/${d}.ics?token=${token}`)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-stone-500">Chargement…</p>

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Calendrier</h2>
      </div>
      <div className="flex flex-col gap-4 p-4">
        {icalUrl ? (
          <>
            <p className="text-sm text-stone-600">Lien iCal pour synchroniser vos rendez-vous :</p>
            <div className="flex items-center gap-2">
              <input readOnly value={icalUrl} className={`${inputClass} bg-stone-50 text-xs`} />
              <button onClick={() => navigator.clipboard.writeText(icalUrl)}
                className="shrink-0 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
                Copier
              </button>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
              <p className="font-medium text-stone-700">Instructions :</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Google Calendar : Paramètres → Ajouter depuis une URL</li>
                <li>Apple Calendar : Fichier → Nouvel abonnement calendrier</li>
                <li>Outlook : Ajouter un calendrier → À partir d&apos;Internet</li>
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-500">Calendrier non configuré pour ce cabinet.</p>
        )}
      </div>
    </div>
  )
}
