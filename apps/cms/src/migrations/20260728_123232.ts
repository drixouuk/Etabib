import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_availability_slots_day_of_week" AS ENUM('1', '2', '3', '4', '5', '6', '0');
  CREATE TABLE "availability_slots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer NOT NULL,
  	"doctor_id" integer,
  	"day_of_week" "enum_availability_slots_day_of_week" NOT NULL,
  	"start_time" varchar NOT NULL,
  	"end_time" varchar NOT NULL,
  	"duration_minutes" numeric DEFAULT 30 NOT NULL,
  	"buffer_minutes" numeric DEFAULT 15,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "tenants" ALTER COLUMN "settings_max_secretary_accounts" DROP DEFAULT;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "availability_slots_id" integer;
  ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "availability_slots_tenant_idx" ON "availability_slots" USING btree ("tenant_id");
  CREATE INDEX "availability_slots_doctor_idx" ON "availability_slots" USING btree ("doctor_id");
  CREATE INDEX "availability_slots_updated_at_idx" ON "availability_slots" USING btree ("updated_at");
  CREATE INDEX "availability_slots_created_at_idx" ON "availability_slots" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_availability_slots_fk" FOREIGN KEY ("availability_slots_id") REFERENCES "public"."availability_slots"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_availability_slots_id_idx" ON "payload_locked_documents_rels" USING btree ("availability_slots_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "availability_slots" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "availability_slots" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_availability_slots_fk";
  
  DROP INDEX "payload_locked_documents_rels_availability_slots_id_idx";
  ALTER TABLE "tenants" ALTER COLUMN "settings_max_secretary_accounts" SET DEFAULT null;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "availability_slots_id";
  DROP TYPE "public"."enum_availability_slots_day_of_week";`)
}
