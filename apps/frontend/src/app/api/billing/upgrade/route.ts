import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { authenticate } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { targetTier } = await req.json()
  if (!['vitrine', 'rdv', 'cabinet'].includes(targetTier)) {
    return NextResponse.json({ error: 'Tier invalide' }, { status: 400 })
  }

  const user = await authenticate()
  const tenantId = user ? getTenantId(user) : undefined
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 })

  const tenantRes = await fetch(`${CMS_URL}/api/tenants/${tenantId}?depth=0`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!tenantRes.ok) return NextResponse.json({ error: 'Erreur récupération tenant' }, { status: 500 })
  const tenant = await tenantRes.json()

  const tid = tenant.id || tenantId
  const currentTier = tenant.settings?.activeTier
  const tierOrder = ['vitrine', 'rdv', 'cabinet']
  if (tierOrder.indexOf(targetTier) <= tierOrder.indexOf(currentTier)) {
    return NextResponse.json({ error: 'Le tier cible doit être supérieur au tier actuel' }, { status: 400 })
  }

  const patchRes = await fetch(`${CMS_URL}/api/tenants/${tid}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: { ...tenant.settings, activeTier: targetTier } }),
  })
  if (!patchRes.ok) return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })

  if (targetTier !== 'vitrine' && (currentTier === 'vitrine' || currentTier === undefined)) {
    const days = ['1', '2', '3', '4', '5', '6']
    for (const dayOfWeek of days) {
      await fetch(`${CMS_URL}/api/availability-slots`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant: tid, dayOfWeek, startTime: '09:00', endTime: '17:00', durationMinutes: 30, bufferMinutes: 15, isActive: true }),
      })
    }
  }

  // B7 — le tier et les créneaux viennent de changer : les lectures mises en
  // cache (accès par tier, widget RDV) se rafraîchissent, scopées au tenant.
  revalidateTag(`col:tenants:tenant:${tenantId}`, 'default')
  revalidateTag(`col:availability-slots:tenant:${tenantId}`, 'default')

  return NextResponse.json({ success: true, tier: targetTier })
}
