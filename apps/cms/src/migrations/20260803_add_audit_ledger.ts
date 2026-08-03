import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Phase D — D1 : registre d'audit médical immuable.
// - create-only (access update/delete → false côté collection)
// - actor / tenant / occurred_at verrouillés côté serveur (beforeChange)
// - idempotence : index unique partiel (entity, entity_id, action, dedup_key)
//   WHERE dedup_key IS NOT NULL — lectures fenêtrées à l'heure via dedupKey,
//   événements rejoués rejetés silencieusement (try/catch côté hook)

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "audit_ledger" (
      "id" serial PRIMARY KEY NOT NULL,
      "patient_id" integer,
      "actor_id" integer,
      "tenant_id" integer,
      "action" varchar NOT NULL,
      "entity" varchar NOT NULL,
      "entity_id" varchar,
      "detail" jsonb,
      "dedup_key" varchar,
      "occurred_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "audit_ledger" ADD CONSTRAINT "audit_ledger_patient_id_patients_fk"
      FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "audit_ledger" ADD CONSTRAINT "audit_ledger_actor_id_users_fk"
      FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "audit_ledger" ADD CONSTRAINT "audit_ledger_tenant_id_tenants_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX IF NOT EXISTS "audit_ledger_patient_idx" ON "audit_ledger" USING btree ("patient_id");
    CREATE INDEX IF NOT EXISTS "audit_ledger_tenant_idx" ON "audit_ledger" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "audit_ledger_occurred_at_idx" ON "audit_ledger" USING btree ("occurred_at");

    -- Idempotence : un événement rejouable (entity + entity_id + action +
    -- dedup_key) ne crée qu'une ligne — la rectification est une NOUVELLE
    -- ligne reversed, jamais une suppression.
    CREATE UNIQUE INDEX IF NOT EXISTS "audit_ledger_dedup_idx"
      ON "audit_ledger" USING btree ("entity", "entity_id", "action", "dedup_key")
      WHERE "dedup_key" IS NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "audit_ledger" CASCADE;
  `)
}
