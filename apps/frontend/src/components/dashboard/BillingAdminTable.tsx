'use client'

import { useState, useCallback } from 'react'
import { RefreshCcw, CheckCircle2, Ban, RotateCcw, Bell, StickyNote } from 'lucide-react'

export type BillingRow = {
  id: string
  tenantId: string
  tenantName: string
  domain: string
  plan: string
  status: string
  statusLabel: string
  currentPeriodEnd: string | null
  lastPaymentAt: string | null
  lastReminderAt: string | null
  seats: number | null
  amount: number | null
  billingEmail: string | null
  notes: string | null
}

const STATUS_STYLES: Record<string, string> = {
  trialing: 'bg-primary-50 text-primary-700',
  active: 'bg-success/10 text-success',
  past_due: 'bg-warning/10 text-warning',
  grace: 'bg-error/10 text-error',
  suspended: 'bg-stone-800 text-white',
  expired: 'bg-stone-100 text-stone-600',
  canceled: 'bg-stone-100 text-stone-600',
}

function daysLate(periodEnd: string | null): number | null {
  if (!periodEnd) return null
  const d = Math.floor((Date.now() - new Date(periodEnd).getTime()) / 86400000)
  return d > 0 ? d : 0
}

export default function BillingAdminTable({ initialRows }: { initialRows: BillingRow[] }) {
  const [rows, setRows] = useState<BillingRow[]>(initialRows)
  const [busy, setBusy] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch('/api/billing/admin')
    const data = await res.json().catch(() => null)
    if (data?.docs) setRows(data.docs)
  }, [])

  const act = useCallback(async (action: string, row: BillingRow, note?: string) => {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/billing/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: row.id, note }),
      })
      if (res.ok) {
        await refresh()
      } else {
        setMessage('Action échouée')
      }
    } catch {
      setMessage('Action échouée')
    }
    setBusy(false)
  }, [refresh])

  const runCycle = useCallback(async () => {
    setRunning(true)
    setMessage('')
    try {
      const res = await fetch('/api/billing/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-cycle' }),
      })
      const data = await res.json().catch(() => null)
      setMessage(data?.transitions ? `${data.transitions.length} transitions · ${data.ensured} abonnements créés · ${data.emails.length} emails` : 'Cycle terminé')
      await refresh()
    } catch {
      setMessage('Échec du cycle')
    }
    setRunning(false)
  }, [refresh])

  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—')

  return (
    <div className="rounded-xl border border-warm bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-stone-800">File d&apos;attente dunning</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={runCycle}
            disabled={running || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cta-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cta-700 disabled:opacity-50"
          >
            <RefreshCcw className="size-3.5" />{running ? 'Cycle…' : 'Lancer le cycle'}
          </button>
          <button onClick={refresh} disabled={busy} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
            Actualiser
          </button>
        </div>
      </div>

      {message && <p className="border-b border-stone-100 bg-primary-50/50 px-4 py-2 text-xs text-primary-700">{message}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-xs uppercase text-stone-500">
              <th className="px-4 py-2.5 font-semibold">Cabinet</th>
              <th className="px-4 py-2.5 font-semibold">Plan</th>
              <th className="px-4 py-2.5 font-semibold">Statut</th>
              <th className="px-4 py-2.5 font-semibold">Fin cycle</th>
              <th className="px-4 py-2.5 font-semibold">Retard</th>
              <th className="px-4 py-2.5 font-semibold">Montant</th>
              <th className="px-4 py-2.5 font-semibold">Dernière relance</th>
              <th className="px-4 py-2.5 font-semibold">Notes</th>
              <th className="px-4 py-2.5 text-end font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-stone-500">Aucun abonnement à suivre.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-stone-50 align-top hover:bg-stone-50/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-stone-800">{row.tenantName}</p>
                  <p className="text-xs text-stone-500">{row.domain}</p>
                  {row.billingEmail && <p className="text-xs text-stone-500">{row.billingEmail}</p>}
                </td>
                <td className="px-4 py-3 text-stone-700 capitalize">{row.plan}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status] || 'bg-stone-100 text-stone-600'}`}>
                    {row.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-600">{fmtDate(row.currentPeriodEnd)}</td>
                <td className="px-4 py-3 text-stone-600">{daysLate(row.currentPeriodEnd) !== null ? `${daysLate(row.currentPeriodEnd)} j` : '—'}</td>
                <td className="px-4 py-3 text-stone-600">{row.amount || 0} MAD</td>
                <td className="px-4 py-3 text-stone-600">{fmtDate(row.lastReminderAt)}</td>
                <td className="max-w-[180px] px-4 py-3 text-xs text-stone-500 whitespace-pre-line">{row.notes || ''}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1">
                    {row.status !== 'active' && (
                      <button onClick={() => act('mark-paid', row)} disabled={busy} title="Marquer payé"
                        className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success hover:bg-success/20 disabled:opacity-50">
                        <CheckCircle2 className="size-3" />Payé
                      </button>
                    )}
                    <button onClick={() => act('remind', row)} disabled={busy} title="Envoyer une relance"
                      className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50">
                      <Bell className="size-3" />Relance
                    </button>
                    {row.status !== 'suspended' && row.status !== 'expired' && (
                      <button onClick={() => act('suspend', row)} disabled={busy} title="Suspendre"
                        className="inline-flex items-center gap-1 rounded-md bg-error/10 px-2 py-1 text-xs font-medium text-error hover:bg-error/20 disabled:opacity-50">
                        <Ban className="size-3" />Suspendre
                      </button>
                    )}
                    {['suspended', 'expired', 'grace'].includes(row.status) && (
                      <button onClick={() => act('restore', row)} disabled={busy} title="Restaurer"
                        className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50">
                        <RotateCcw className="size-3" />Restaurer
                      </button>
                    )}
                    <button onClick={() => { const n = prompt('Note interne (appel, accord…)'); if (n) act('note', row, n) }} disabled={busy} title="Ajouter une note"
                      className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-200 disabled:opacity-50">
                      <StickyNote className="size-3" />Note
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
