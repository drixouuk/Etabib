import { NextResponse } from 'next/server'
import { fetchCMS, postCMS } from '@/lib/cms-fetch'

type Patient = {
  id: string
  fullName: string
  gender?: string | null
  birthDate?: string | null
  nationalId?: string | null
}

function esc(val: string | null | undefined): string {
  if (!val) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET() {
  const data = await fetchCMS<{ docs: Patient[] }>(
    '/api/patients?limit=10000&depth=0&sort=fullName',
  )
  const patients = data?.docs ?? []

  const header = 'fullName,gender,birthDate,nationalId'
  const rows = patients.map(
    (p) =>
      `${esc(p.fullName)},${esc(p.gender)},${esc(p.birthDate?.slice(0, 10))},${esc(p.nationalId)}`,
  )
  const csv = [header, ...rows].join('\r\n')

  // D1 — événement « exported » dans le ledger (non bloquant, session CMS).
  // Trace actionnable : nombre de lignes + ids exportés (bornés à 500).
  await postCMS('/api/audit-ledger/export-event', {
    patientId: null,
    count: patients.length,
    ids: patients.map((p) => p.id).slice(0, 500),
  })

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="patients.csv"',
    },
  })
}
