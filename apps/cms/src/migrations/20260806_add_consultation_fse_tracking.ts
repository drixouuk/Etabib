import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Suivi FSE (CNSS) — déclaratif, optionnel :
// - fse_status (varchar) : select non_envoyee / envoyee / acceptee /
//   remboursee / rejetee — défaut 'non_envoyee' géré par le champ Payload.
// - fse_sent_at (timestamp) : date d'envoi, base de l'alerte de délai.
// - fse_status_updated_at (timestamp) : tracé automatique par hook
//   beforeChange à chaque changement de fse_status.
// Colonnes NULLABLE (rétrocompat : les consultations existantes n'ont pas de
// statut) ; portabilité SQLite v1 (pas d'ALTER COLUMN SET NOT NULL).

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "consultations"
    ADD COLUMN IF NOT EXISTS "fse_status" varchar,
    ADD COLUMN IF NOT EXISTS "fse_sent_at" timestamp(3) with time zone,
    ADD COLUMN IF NOT EXISTS "fse_status_updated_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "consultations"
    DROP COLUMN IF EXISTS "fse_status",
    DROP COLUMN IF EXISTS "fse_sent_at",
    DROP COLUMN IF EXISTS "fse_status_updated_at";`)
}
