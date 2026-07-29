import { cookies } from 'next/headers'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

async function getToken(): Promise<string | null> {
  const store = await cookies()
  return store.get('payload-token')?.value ?? null
}

export async function fetchCMS<T>(
  path: string,
  options?: { revalidate?: number; cache?: RequestInit['cache'] },
): Promise<T | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const url = new URL(path.startsWith('http') ? path : `${CMS_URL}${path}`)
    url.searchParams.set('depth', '1')

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: options?.revalidate !== undefined ? { revalidate: options.revalidate } : { revalidate: 0 },
      cache: options?.cache,
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function postCMS<T>(path: string, data: unknown): Promise<T | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function patchCMS<T>(path: string, data: unknown): Promise<T | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const res = await fetch(`${CMS_URL}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
