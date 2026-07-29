import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

type PrescriptionDoc = {
  id: string
  medications: { nom: string; dci: string; posologie: string; duree: string }[]
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase()
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(`${CMS_URL}/api/prescriptions?depth=0&limit=500&sort=-date`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'CMS error' }, { status: 500 })
  }

  const data = await res.json()
  const prescriptions: PrescriptionDoc[] = data.docs ?? []

  const seen = new Map<string, { nom: string; dci: string; count: number }>()

  for (const p of prescriptions) {
    for (const m of p.medications ?? []) {
      if (!m.nom?.trim()) continue
      const nomLower = m.nom.toLowerCase()
      if (!nomLower.includes(q)) continue

      const key = nomLower
      if (!seen.has(key)) {
        seen.set(key, { nom: m.nom.trim(), dci: m.dci?.trim() || '', count: 1 })
      } else {
        const entry = seen.get(key)!
        entry.count++
      }
    }
  }

  const suggestions = Array.from(seen.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return NextResponse.json({ suggestions })
}
