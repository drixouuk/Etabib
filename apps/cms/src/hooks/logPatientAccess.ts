import type { CollectionAfterReadHook, CollectionAfterChangeHook } from 'payload'

function writeAlert(payload: any, level: 'error' | 'critical', message: string, context: unknown) {
  payload.create({
    collection: 'system-alerts',
    data: {
      level,
      message,
      context: context instanceof Object ? JSON.parse(JSON.stringify(context)) : context,
      timestamp: new Date().toISOString(),
    },
  }).catch((err: unknown) => {
    console.error('CRITICAL: audit log AND alert both failed', message, err)
  })
}

function createAuditLog(req: any, action: string, collectionName: string, doc: any) {
  req.payload.create({
    collection: 'audit-logs',
    data: {
      action,
      collectionName,
      documentId: doc.id as string,
      user: req.user.id,
      tenant: req.user?.tenant && typeof req.user.tenant === 'object' ? (req.user.tenant as any).id : req.user?.tenant ?? null,
      timestamp: new Date().toISOString(),
    },
  }).catch((err: unknown) => {
    writeAlert(req.payload, 'error', 'Échec d\'écriture audit-log', {
      action, collectionName, documentId: doc.id, error: String(err),
    })
  })
}

export function auditReadHook(collectionName: string): CollectionAfterReadHook {
  return ({ req, doc }) => {
    if (!req.user) return doc
    createAuditLog(req, 'read', collectionName, doc)
    return doc
  }
}

export function auditWriteHook(collectionName: string): CollectionAfterChangeHook {
  return ({ req, doc }) => {
    if (!req.user) return doc
    createAuditLog(req, 'write', collectionName, doc)
    return doc
  }
}
