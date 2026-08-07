'use client'

// Suivi FSE (CNSS) — déclaratif. Badge de statut + indicateur de délai
// anormal : fseStatus 'envoyee' depuis plus de FSE_ALERT_DAYS jours.
// Seuil configurable ici (30 j par défaut, délai normal évoqué dans
// l'audit marché). Aucune automatisation API — mise à jour manuelle.

export const FSE_ALERT_DAYS = 45

export type FseStatus = 'non_envoyee' | 'envoyee' | 'acceptee' | 'remboursee' | 'rejetee'

export const FSE_STATUS_OPTIONS: { value: FseStatus; label: string }[] = [
  { value: 'non_envoyee', label: 'Non envoyée' },
  { value: 'envoyee', label: 'Envoyée' },
  { value: 'acceptee', label: 'Acceptée' },
  { value: 'remboursee', label: 'Remboursée' },
  { value: 'rejetee', label: 'Rejetée' },
]

const STATUS_META: Record<FseStatus, { label: string; className: string }> = {
  non_envoyee: { label: 'Non envoyée', className: 'bg-stone-100 text-stone-600' },
  envoyee: { label: 'Envoyée', className: 'bg-sky-50 text-sky-700' },
  acceptee: { label: 'Acceptée', className: 'bg-emerald-50 text-emerald-700' },
  remboursee: { label: 'Remboursée', className: 'bg-emerald-50 text-emerald-700' },
  rejetee: { label: 'Rejetée', className: 'bg-red-50 text-red-700' },
}

export function isFseOverdue(status?: string | null, sentAt?: string | null): boolean {
  if (status !== 'envoyee' || !sentAt) return false
  const elapsed = Date.now() - new Date(sentAt).getTime()
  return elapsed > FSE_ALERT_DAYS * 24 * 60 * 60 * 1000
}

export default function FseStatusBadge({
  status,
  sentAt,
}: {
  status?: string | null
  sentAt?: string | null
}) {
  if (!status || status === 'non_envoyee') return null
  const meta = STATUS_META[status as FseStatus] ?? STATUS_META.non_envoyee
  const overdue = isFseOverdue(status, sentAt)

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.className}`}>
        {meta.label}
      </span>
      {overdue && (
        <span
          className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800"
          title={`Envoyée le ${sentAt ? new Date(sentAt).toLocaleDateString('fr-FR') : '—'} — délai anormal (> ${FSE_ALERT_DAYS} jours) sans retour CNSS`}
        >
          Délai anormal
        </span>
      )}
    </span>
  )
}
