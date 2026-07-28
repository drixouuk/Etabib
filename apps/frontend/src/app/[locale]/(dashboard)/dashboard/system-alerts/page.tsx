import { requireAuth } from '@/lib/auth'
import { fetchCMS } from '@/lib/cms-fetch'

type SystemAlert = {
  id: string
  level: 'error' | 'critical'
  message: string
  context?: Record<string, unknown> | null
  timestamp: string
}

export default async function SystemAlertsPage() {
  const user = await requireAuth()

  if (!user.roles?.includes('superadmin')) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
        <p className="text-stone-800-soft">Accès réservé aux super-administrateurs.</p>
      </div>
    )
  }

  const data = await fetchCMS<{ docs: SystemAlert[] }>(
    `/api/system-alerts?sort=-timestamp&limit=100`,
    { revalidate: 0 },
  )
  const alerts = data?.docs ?? []

  const levelLabels: Record<string, string> = {
    error: 'Erreur',
    critical: 'Critique',
  }

  const levelColors: Record<string, string> = {
    error: 'text-amber-600 bg-amber-50',
    critical: 'text-red-600 bg-red-50',
  }

  return (
    <div className="mx-auto max-w-container px-4 py-12 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-stone-800">
          Alertes système
        </h1>
        <p className="mt-1 text-sm text-stone-800-soft">
          Événements de défaillance technique (écriture audit-log, etc.)
        </p>
      </div>

      {alerts.length === 0 ? (
        <p className="text-stone-800-soft">Aucune alerte.</p>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <details
              key={a.id}
              className="overflow-hidden rounded-xl border border-warm bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50">
                <span
                  className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${levelColors[a.level] || 'text-stone-600 bg-stone-50'}`}
                >
                  {levelLabels[a.level] || a.level}
                </span>
                <span className="flex-1 text-stone-800">{a.message}</span>
                <span className="shrink-0 text-xs text-stone-800-soft">
                  {new Date(a.timestamp).toLocaleString('fr-FR')}
                </span>
              </summary>
              {a.context && (
                <pre className="overflow-x-auto border-t border-stone-100 px-4 py-3 text-xs text-stone-600">
                  {JSON.stringify(a.context, null, 2)}
                </pre>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
