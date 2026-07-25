'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import PatientActionsDropdown from '@/components/dashboard/PatientActionsDropdown'
import PatientAvatar from '@/components/dashboard/PatientAvatar'
import { Badge } from '@/components/ui/badge'
import { computeAge } from '@/lib/age'

type Patient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  nationalId?: string | null
  medicalNotes?: string
  updatedAt: string
}

const PER_PAGE = 10

function isRecent(iso: string): boolean {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return new Date(iso) >= thirtyDaysAgo
}

export default function PatientTable({
  patients,
  lastConsultations,
  q,
}: {
  patients: Patient[]
  lastConsultations: Record<string, string>
  q?: string
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(patients.length / PER_PAGE))
  const paginated = patients.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Âge</th>
              <th className="px-4 py-3 font-medium">Dernière consultation</th>
              <th className="px-4 py-3 font-medium">Date de naissance</th>
              <th className="px-4 py-3 font-medium">CIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                  {q ? 'Aucun patient trouvé pour cette recherche.' : 'Aucun patient pour le moment.'}
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PatientAvatar fullName={p.fullName} gender={p.gender as 'boy' | 'girl' | null} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <PatientActionsDropdown patientId={p.id} patientName={p.fullName} />
                          <Link
                            href={`/dashboard/patients/${p.id}`}
                            className="font-medium text-stone-800 hover:text-primary-600 transition-colors duration-200"
                          >
                            {p.fullName}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {p.birthDate ? computeAge(p.birthDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {lastConsultations[p.id] ? (
                      <Badge variant={isRecent(lastConsultations[p.id]) ? 'default' : 'secondary'}>
                        {new Date(lastConsultations[p.id]).toLocaleDateString('fr-FR')}
                      </Badge>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {p.birthDate
                      ? new Date(p.birthDate).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{p.nationalId || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {patients.length > PER_PAGE && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                p === page ? 'bg-primary-700 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
