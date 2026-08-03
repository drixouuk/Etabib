import type { CollectionAfterChangeHook, CollectionAfterReadHook } from 'payload'

/**
 * Registre d'audit médical (Phase D — D1).
 *
 * Ligne immuable par événement : jamais de mise à jour ni de suppression
 * (access update/delete → false sur la collection). La rectification est une
 * nouvelle ligne `action: 'reversed'` référençant l'originale via detail.
 *
 * Idempotence : `dedupKey` + index unique partiel (entity, entity_id, action,
 * dedup_key) WHERE dedup_key IS NOT NULL — un événement rejoué est rejeté par
 * la base et absorbé par le try/catch. Les lectures sont fenêtrées à l'heure
 * (read:{actor}:{patient}:{YYYY-MM-DDTHH}) : tracer l'accès sans inonder le
 * ledger. create/update/export : dedupKey null (chaque écriture est un
 * événement distinct).
 *
 * NON BLOQUANT : l'écriture d'audit ne doit jamais faire échouer l'opération
 * médicale qui la déclenche.
 */

/** Clé de dédup fenêtrée à l'heure (UTC) pour les événements de lecture. */
export function readDedupKey(userId: string, patientId: string, now: Date): string {
  return `read:${userId}:${patientId}:${now.toISOString().slice(0, 13)}`
}

export type LedgerEntry = {
  patient?: string | number | null
  action: string
  entity: string
  entityId?: string | number | null
  detail?: Record<string, unknown>
  dedupKey?: string | null
}

export async function ledgerWrite(payload: any, req: any, entry: LedgerEntry): Promise<void> {
  try {
    await payload.create({
      collection: 'audit-ledger',
      data: {
        patient: entry.patient ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId != null ? String(entry.entityId) : null,
        detail: entry.detail ?? {},
        dedupKey: entry.dedupKey ?? null,
        // actor / tenant / occurredAt sont verrouillés par beforeChange
        // (valeurs serveur uniquement, jamais issues du body).
      },
      req,
    })
  } catch (err) {
    // Non bloquant — y compris les doublons d'index unique (lectures fenêtrées).
    payload.logger?.warn?.('[audit-ledger]', err)
  }
}

function patientIdOf(value: unknown): string | number | null {
  if (value == null) return null
  if (typeof value === 'object') return (value as any).id ?? null
  return value as string | number
}

/**
 * afterChange : « created » / « updated » avec snapshot avant/après.
 * dedupKey null (chaque écriture est un événement distinct).
 */
export function ledgerAfterChange(entity: string): CollectionAfterChangeHook {
  return async ({ req, doc, previousDoc, operation }) => {
    if (!req.user) return doc
    const d = doc as any
    await ledgerWrite(req.payload, req, {
      patient: patientIdOf(d.patient),
      action: operation === 'create' ? 'created' : 'updated',
      entity,
      entityId: d.id,
      detail: { before: previousDoc ?? null, after: doc },
      dedupKey: null,
    })
    return doc
  }
}

/**
 * afterRead : événement « read » fenêtré à l'heure (dedupKey) — l'accès est
 * tracé sans inonder le ledger.
 */
export function ledgerRead(entity: string, patientRef: (doc: any) => unknown): CollectionAfterReadHook {
  return async ({ req, doc }) => {
    if (!req.user) return doc
    const d = doc as any
    const patientId = patientIdOf(patientRef(d))
    if (!patientId) return doc
    await ledgerWrite(req.payload, req, {
      patient: patientId,
      action: 'read',
      entity,
      entityId: d.id,
      detail: { actor: req.user.id },
      dedupKey: readDedupKey(String(req.user.id), String(patientId), new Date()),
    })
    return doc
  }
}
