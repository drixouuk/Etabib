import { NextRequest, NextResponse } from 'next/server'

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.etabibi.ma'

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')
  const tenantSlug = request.headers.get('x-tenant-slug')
  const isDemo = tenantSlug === 'drdemo' || tenantSlug === 'dr-demo' || tenantSlug?.includes('demo')

  let doctorName = ''
  let specialty = ''
  let city = ''

  if (tenantId && tenantId !== 'default') {
    const [docRes, infoRes] = await Promise.all([
      fetch(`${CMS_URL}/api/doctors?where[tenant][equals]=${encodeURIComponent(tenantId)}&limit=1&depth=0`),
      fetch(`${CMS_URL}/api/practice-info?where[tenant][equals]=${encodeURIComponent(tenantId)}&limit=1&depth=0`),
    ])
    const [docData, infoData] = await Promise.all([docRes.json().catch(() => null), infoRes.json().catch(() => null)])
    const doctor = docData?.docs?.[0]
    const info = infoData?.docs?.[0]
    if (doctor?.name) doctorName = doctor.name
    if (doctor?.specialty) specialty = doctor.specialty
    if (info?.city) city = info.city
  }

  if (isDemo && !doctorName) doctorName = 'Dr Demo'

  return NextResponse.json({ doctorName, specialty, city, isDemo })
}
