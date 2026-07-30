'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const tierLabels: Record<string, string> = { vitrine: 'Site vitrine', rdv: 'RDV en ligne', cabinet: 'Cabinet' }

export default function BillingSettings() {
  const router = useRouter()
  const [tier, setTier] = useState('')
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    fetch('/api/cms-proxy/tenants?depth=0&limit=1')
      .then(r => r.json())
      .then(j => {
        const doc = j.docs?.[0]
        setTier(doc?.settings?.activeTier || '')
        setDomain(doc?.domain || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleUpgrade = async (target: string) => {
    if (!confirm(`Passer à la formule ${tierLabels[target]} ?`)) return
    setUpgrading(true)
    await fetch('/api/billing/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetTier: target }),
    })
    router.refresh()
    setUpgrading(false)
  }

  if (loading) return <p className="text-sm text-stone-500">Chargement…</p>

  const isCabinet = tier === 'cabinet'

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Facturation</h2>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-lg bg-primary-50 p-4">
          <p className="text-xs text-primary-600 uppercase font-bold">Plan actuel</p>
          <p className="mt-1 font-heading text-xl font-bold text-stone-800">{tierLabels[tier] || tier || '—'}</p>
          <p className="text-sm text-stone-500">{domain && `https://${domain}`}</p>
        </div>

        {!isCabinet && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">Mettre à niveau :</p>
            {tier === 'vitrine' && (
              <button onClick={() => handleUpgrade('rdv')} disabled={upgrading}
                className="w-full rounded-lg border border-primary-200 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors">
                RDV en ligne — 199 MAD/mois
              </button>
            )}
            <button onClick={() => handleUpgrade('cabinet')} disabled={upgrading}
              className="w-full rounded-lg bg-cta-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cta-700 disabled:opacity-50">
              Cabinet complet — à partir de 499 MAD/mois
            </button>
          </div>
        )}

        {isCabinet && (
          <p className="text-sm text-stone-500">Vous êtes sur la formule la plus complète.</p>
        )}
      </div>
    </div>
  )
}
