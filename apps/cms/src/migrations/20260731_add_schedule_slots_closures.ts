import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tenants" ADD COLUMN "settings_custom_slots" boolean DEFAULT false;
  ALTER TABLE "tenants" ADD COLUMN "settings_default_slot_duration" numeric DEFAULT 30;
  ALTER TABLE "tenants" ADD COLUMN "settings_default_slot_buffer" numeric DEFAULT 15;
  ALTER TABLE "practice_info_schedules" ADD COLUMN "day_of_week" numeric;

  UPDATE "practice_info_schedules" AS s
  SET "day_of_week" = CASE
    WHEN l."day" IN ('Lundi','lundi') THEN 1
    WHEN l."day" IN ('Mardi','mardi') THEN 2
    WHEN l."day" IN ('Mercredi','mercredi') THEN 3
    WHEN l."day" IN ('Jeudi','jeudi') THEN 4
    WHEN l."day" IN ('Vendredi','vendredi') THEN 5
    WHEN l."day" IN ('Samedi','samedi') THEN 6
    WHEN l."day" IN ('Dimanche','dimanche') THEN 7
  END
  FROM "practice_info_schedules_locales" AS l
  WHERE l."_parent_id" = s."id" AND l."_locale" = 'fr';

  DROP TABLE "practice_info_schedules_locales" CASCADE;

  CREATE TABLE "practice_info_exceptional_closures" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "start_date" timestamp(3) with time zone,
    "end_date" timestamp(3) with time zone,
    "label" varchar
  );

  ALTER TABLE "practice_info_exceptional_closures" ADD CONSTRAINT "practice_info_exceptional_closures_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."practice_info"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "practice_info_exceptional_closures_order_idx" ON "practice_info_exceptional_closures" USING btree ("_order");
  CREATE INDEX "practice_info_exceptional_closures_parent_id_idx" ON "practice_info_exceptional_closures" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "practice_info_exceptional_closures" CASCADE;

  CREATE TABLE "practice_info_schedules_locales" (
    "day" varchar NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" varchar NOT NULL
  );

  ALTER TABLE "practice_info_schedules_locales" ADD CONSTRAINT "practice_info_schedules_locales_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."practice_info_schedules"("id") ON DELETE cascade ON UPDATE no action;

  CREATE UNIQUE INDEX "practice_info_schedules_locales_locale_parent_id_unique"
    ON "practice_info_schedules_locales" USING btree ("_locale","_parent_id");

  ALTER TABLE "practice_info_schedules" DROP COLUMN "day_of_week";
  ALTER TABLE "tenants" DROP COLUMN "settings_custom_slots";
  ALTER TABLE "tenants" DROP COLUMN "settings_default_slot_duration";
  ALTER TABLE "tenants" DROP COLUMN "settings_default_slot_buffer";`)
}
