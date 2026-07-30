'use client'

import { useState } from 'react'

type AuditLog = {
  id: string
  action: 'read' | 'write' | 'export'
  collectionName: string
  documentId: string
  user: { id: string; name?: string; email?: string }
  timestamp: string
}

const PER_PAGE = 10

const actionLabels: Record<string, string> = { read: 'Consultation', write: 'Modification', export: 'Export' }
const actionColors: Record<string, string> = { read: 'text-primary-600 bg-primary-50', write: 'text-warning bg-warning/10', export: 'text-purple-600 bg-purple-50' }

export default function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(logs.length / PER_PAGE))
  const paginated = logs.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-warm bg-white shadow-sm">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-warm text-xs uppercase text-stone-600">
            <tr>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Collection</th>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Utilisateur</th>
              <th className="px-4 py-3 font-medium">Horodatage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Aucune entrée d&apos;audit.</td></tr>
            ) : (
              paginated.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[log.action] || 'text-stone-600 bg-stone-50'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{log.collectionName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">{log.documentId}</td>
                  <td className="px-4 py-3 text-stone-600">{log.user?.name || log.user?.email || '—'}</td>
                  <td className="px-4 py-3 text-stone-600">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {logs.length > PER_PAGE && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-warm bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                p === page ? 'bg-primary-700 text-white' : 'border border-warm bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-warm bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
