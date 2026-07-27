const INVOICE_NINJA_URL = process.env.INVOICE_NINJA_URL || ''
const INVOICE_NINJA_API_KEY = process.env.INVOICE_NINJA_API_KEY || ''

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  if (!INVOICE_NINJA_URL || !INVOICE_NINJA_API_KEY) {
    console.warn('Invoice Ninja non configuré (INVOICE_NINJA_URL / INVOICE_NINJA_API_KEY)')
    return null
  }

  try {
    const res = await fetch(`${INVOICE_NINJA_URL}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': INVOICE_NINJA_API_KEY,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function calculateCabinetPrice(doctorCount: number): number {
  return 499 + Math.max(0, doctorCount - 1) * 199
}

const TIER_PRICES: Record<string, number> = {
  vitrine: 0,
  rdv: 149,
  cabinet: 499,
}

export type InvoiceNinjaClient = {
  data: { id: string; number?: string; name?: string }
}

export type InvoiceNinjaInvoice = {
  data: { id: string; number?: string; amount?: number }
}

export async function createClient(tenantData: {
  name: string
  email: string
  phone?: string
}): Promise<string | null> {
  const result = await apiRequest<InvoiceNinjaClient>('POST', '/clients', {
    name: tenantData.name,
    contacts: [{ email: tenantData.email, phone: tenantData.phone }],
    currency_id: '1',
  })
  return result?.data?.id ?? null
}

export async function createSubscriptionInvoice(
  clientId: string,
  tier: string,
  doctorCount?: number,
): Promise<string | null> {
  const amount = tier === 'cabinet' && doctorCount !== undefined
    ? calculateCabinetPrice(doctorCount)
    : TIER_PRICES[tier]
  if (amount === undefined) return null

  const lineItems: any[] = tier === 'cabinet' && doctorCount !== undefined
    ? [
        { product_key: 'abonnement-cabinet-base', notes: 'Abonnement Cabinet — 1 médecin', cost: 499, qty: 1 },
        ...(doctorCount > 1 ? [{ product_key: 'abonnement-cabinet-extra', notes: `Médecins supplémentaires (${doctorCount - 1})`, cost: 199, qty: doctorCount - 1 }] : []),
      ]
    : [{ product_key: `abonnement-${tier}`, notes: `Abonnement dr-tabibi — Offre ${tier}`, cost: amount, qty: 1 }]

  const result = await apiRequest<InvoiceNinjaInvoice>('POST', '/invoices', {
    client_id: clientId,
    amount,
    line_items: lineItems,
  })
  return result?.data?.id ?? null
}
