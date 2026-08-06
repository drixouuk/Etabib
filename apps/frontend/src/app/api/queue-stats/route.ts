import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function GET(req: NextRequest) {
  // users/me est dédupliqué par requête (cache()) et mis en cache 20s par
  // token : plus d'appel CMS dédié pour dériver le tenant.
  const user = await authenticate()
  const tenantId = user ? getTenantId(user) : undefined
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 })

  const token = req.cookies.get('payload-token')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const waitingRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[status][equals]=waiting&depth=0&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const waitingData = await waitingRes.json()
  const waiting = waitingData?.docs?.length ?? 0

  const todayRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[createdAt][greater_than]=${today.toISOString()}&depth=0&limit=500`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const todayData = await todayRes.json()
  const todayTotal = todayData?.docs?.length ?? 0

  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const historyRes = await fetch(
    `${CMS_URL}/api/queue-items?where[tenant][equals]=${tenantId}&where[createdAt][greater_than]=${thirtyDaysAgo.toISOString()}&where[createdAt][less_than]=${today.toISOString()}&depth=0&limit=2000`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const historyData = await historyRes.json()
  const historyItems = historyData?.docs ?? []

  const dailyTotals: Record<string, number> = {}
  historyItems.forEach((i: any) => {
    const day = new Date(i.createdAt).toISOString().slice(0, 10)
    dailyTotals[day] = (dailyTotals[day] || 0) + 1
  })
  const totals = Object.values(dailyTotals)
  const dailyAverage = totals.length > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0
  const dailyRecord = totals.length > 0 ? Math.max(...totals) : 0

  return NextResponse.json({ waiting, todayTotal, dailyAverage, dailyRecord })
}
