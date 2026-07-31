'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Closure = { startDate: string; endDate?: string; label: string }

function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateRange(start: string, end?: string): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return end ? `${fmt(start)} au ${fmt(end)}` : `le ${fmt(start)}`
}

export default function ClosureBanner({ closures }: { closures: Closure[] }) {
  const [dismissed, setDismissed] = useState(() =>
    typeof document !== 'undefined' && document.cookie.includes('closure-dismissed=1'),
  )

  const today = toLocalDate(new Date())
  const active = closures.find(c => c.startDate <= today && (!c.endDate || c.endDate >= today))
  if (!active || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    document.cookie = `closure-dismissed=1; path=/; max-age=${Math.floor((midnight.getTime() - now.getTime()) / 1000)}; SameSite=Lax`
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center">
      <p className="inline text-sm font-semibold text-amber-800">
        ⚠️ {active.label} — {formatDateRange(active.startDate, active.endDate)}
      </p>
      <button
        onClick={dismiss}
        aria-label="Fermer le bandeau"
        className="ml-3 inline-flex size-5 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100 align-middle"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
