import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export type PayloadUser = {
  id: string
  email: string
  name: string
  roles: string[]
  tenant?: string | { id: string }
  doctorProfile?: string | { id: string; name?: string; specialty?: string } | null
  accessExpiresAt?: string | null
}

export async function authenticate(): Promise<PayloadUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return null

    const res = await fetch(`${CMS_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) return null
    const json = await res.json()
    return json.user ?? null
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<PayloadUser> {
  const user = await authenticate()
  if (!user) {
    redirect('/login')
  }
  if (user.roles?.includes('substitute') && user.accessExpiresAt) {
    if (new Date(user.accessExpiresAt) < new Date()) {
      const cookieStore = await cookies()
      cookieStore.delete('payload-token')
      redirect('/login')
    }
  }
  return user
}
