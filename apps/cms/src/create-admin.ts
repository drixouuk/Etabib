import { getPayload } from 'payload'
import config from '../payload.config.js'

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@etabibi.ma'

async function createAdmin() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    console.log('→ Admin already exists')
    process.exit(0)
  }

  await payload.create({
    collection: 'users',
    data: {
      email: ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD ?? (() => { throw new Error('ADMIN_PASSWORD manquant — définis cette variable d\'environnement avant de lancer le script.') })(),
      name: process.env.SUPERADMIN_NAME || 'Admin',
      roles: ['superadmin'],
    },
  })

  console.log('✅ Admin user created')
  process.exit(0)
}

createAdmin().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
