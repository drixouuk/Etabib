import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Phase B — B3 : récurrence des créneaux de disponibilité.
// - availability_slots.recurrence_rule (iCal, nullable)
// - availability_slots.recurrence_end (fin de série inclusive)
// - availability_slots_exceptions (table d'array Payload : dates exclues)

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "availability_slots"
    ADD COLUMN IF NOT EXISTS "recurrence_rule" varchar,
    ADD COLUMN IF NOT EXISTS "recurrence_end" timestamp(3) with time zone;

  CREATE TABLE IF NOT EXISTS "availability_slots_exceptions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "date" timestamp(3) with time zone
  );

  ALTER TABLE "availability_slots_exceptions" ADD CONSTRAINT "availability_slots_exceptions_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."availability_slots"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "availability_slots_exceptions_order_idx" ON "availability_slots_exceptions" USING btree ("_order");
  CREATE INDEX "availability_slots_exceptions_parent_id_idx" ON "availability_slots_exceptions" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "availability_slots_exceptions" CASCADE;

  ALTER TABLE "availability_slots"
    DROP COLUMN IF EXISTS "recurrence_rule",
    DROP COLUMN IF EXISTS "recurrence_end";`)
}
