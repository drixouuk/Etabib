'use client'

import { useState, useEffect } from 'react'

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'

export default function SiteEditor() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cms-proxy/tenants?depth=0&limit=1')
      .then(r => r.json())
      .then(j => {
        const doc = j.docs?.[0]
        if (doc?.domain) setUrl(doc.domain)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-stone-500">Chargement…</p>

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Site web</h2>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-stone-600">Votre site est accessible à l&apos;adresse :</p>
        <div className="flex items-center gap-2">
          <input readOnly value={url ? `https://${url}` : 'Non configuré'} className={`${inputClass} bg-stone-50`} />
          {url && (
            <a href={`https://${url}`} target="_blank" rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
              Ouvrir
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
