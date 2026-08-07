import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// SX-100 — idempotence des écritures de consultation.
// - consultations.clientRequestId (text, UNIQUE) : UUID client stable par
//   consultation (généré au moment du brouillon, réutilisé à chaque replay
//   réseau) → l'endpoint /upsert catch la violation 23505 et retourne
//   l'enregistrement existant au lieu de créer un doublon.
// Backfill des lignes existantes : 'legacy-' || id (id unique par ligne).
// NOT NULL au niveau DB volontairement non posé (portabilité SQLite v1 —
// les ALTER COLUMN SET NOT NULL y sont impossibles) : le required du champ
// Payload valide à l'API, l'unicité est garantie par l'index unique.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "consultations" ADD COLUMN IF NOT EXISTS "client_request_id" text;

  UPDATE "consultations" SET "client_request_id" = 'legacy-' || "id" WHERE "client_request_id" IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS "consultations_client_request_id_idx"
    ON "consultations" USING btree ("client_request_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "consultations_client_request_id_idx";

  ALTER TABLE "consultations" DROP COLUMN IF EXISTS "client_request_id";`)
}
