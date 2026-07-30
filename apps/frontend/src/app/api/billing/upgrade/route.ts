import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { targetTier } = await req.json()
  if (!['vitrine', 'rdv', 'cabinet'].includes(targetTier)) {
    return NextResponse.json({ error: 'Tier invalide' }, { status: 400 })
  }

  const meRes = await fetch(`${CMS_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!meRes.ok) return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  const me = await meRes.json()
  const tenantId = me?.user?.tenant
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 400 })

  const tenantRes = await fetch(`${CMS_URL}/api/tenants/${typeof tenantId === 'object' ? tenantId.id : tenantId}?depth=0`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!tenantRes.ok) return NextResponse.json({ error: 'Erreur récupération tenant' }, { status: 500 })
  const tenant = await tenantRes.json()

  const tid = tenant.id || (typeof tenantId === 'object' ? tenantId.id : tenantId)
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

  return NextResponse.json({ success: true, tier: targetTier })
}
