import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE UNIQUE INDEX IF NOT EXISTS "calbookings_tenant_starttime_active_idx"
   ON "calbookings" ("tenant_id", "start_time")
   WHERE status != 'cancelled';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "calbookings_tenant_starttime_active_idx";
  `)
}
