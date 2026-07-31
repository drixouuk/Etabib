import { NextRequest, NextResponse } from 'next/server'
import { requireWritable } from '@/lib/subscription'

function getCMSURL(): string {
  const url = process.env.NEXT_PUBLIC_CMS_URL
  if (!url) throw new Error('NEXT_PUBLIC_CMS_URL manquant')
  return url
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxyRequest(request, 'GET', path)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const writable = await requireWritable()
  if (!writable.ok) return billingBlocked(writable.status)
  return proxyRequest(request, 'POST', path)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const writable = await requireWritable()
  if (!writable.ok) return billingBlocked(writable.status)
  return proxyRequest(request, 'PATCH', path)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const writable = await requireWritable()
  if (!writable.ok) return billingBlocked(writable.status)
  return proxyRequest(request, 'DELETE', path)
}

// Blocage d'écriture pour paiement en retard (grace/suspended/expired).
// Toutes les mutations CMS passent par ce proxy : le check couvre les routes futures.
function billingBlocked(status: string | null | undefined) {
  return NextResponse.json(
    { error: 'Paiement en retard', detail: { subscriptionStatus: status } },
    { status: 403 },
  )
}

async function proxyRequest(request: NextRequest, method: string, path: string[]) {
  const token = request.cookies.get('payload-token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const queryString = request.nextUrl.searchParams.toString()
  const url = `${getCMSURL()}/api/${path.join('/')}${queryString ? `?${queryString}` : ''}`

  const incomingContentType = request.headers.get('content-type') || ''
  const isMultipart = incomingContentType.startsWith('multipart/form-data')

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    }

    let body: BodyInit | undefined

    if (isMultipart) {
      headers['Content-Type'] = incomingContentType
      body = request.body ?? undefined
    } else if (method !== 'GET') {
      headers['Content-Type'] = 'application/json'
      const json = await request.json().catch(() => undefined)
      body = json ? JSON.stringify(json) : undefined
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body as BodyInit | undefined,
      ...(isMultipart ? { duplex: 'half' } : {}),
    } as any)

    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Erreur de proxy' }, { status: 502 })
  }
}
