import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_tenants_settings_active_tier" RENAME TO "enum_tenants_settings_active_tier_old";
   CREATE TYPE "public"."enum_tenants_settings_active_tier" AS ENUM('vitrine', 'rdv', 'cabinet', 'dossier', 'clinique');
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" DROP DEFAULT;
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" TYPE "public"."enum_tenants_settings_active_tier" USING "settings_active_tier"::text::"public"."enum_tenants_settings_active_tier";
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" SET DEFAULT 'vitrine';
   UPDATE "public"."tenants" SET "settings_active_tier" = 'cabinet' WHERE "settings_active_tier" IN ('dossier', 'clinique');
   CREATE TYPE "public"."enum_tenants_settings_active_tier_final" AS ENUM('vitrine', 'rdv', 'cabinet');
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" DROP DEFAULT;
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" TYPE "public"."enum_tenants_settings_active_tier_final" USING "settings_active_tier"::text::"public"."enum_tenants_settings_active_tier_final";
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" SET DEFAULT 'vitrine';
   DROP TYPE "public"."enum_tenants_settings_active_tier";
   ALTER TYPE "public"."enum_tenants_settings_active_tier_final" RENAME TO "enum_tenants_settings_active_tier";
   ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "settings_doctor_count" numeric DEFAULT 1;
   ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "settings_max_secretary_accounts" numeric;
   UPDATE "public"."tenants" SET "settings_doctor_count" = 1 WHERE "settings_doctor_count" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "public"."tenants" DROP COLUMN IF EXISTS "settings_doctor_count";
   ALTER TABLE "public"."tenants" DROP COLUMN IF EXISTS "settings_max_secretary_accounts";
   UPDATE "public"."tenants" SET "settings_active_tier" = 'dossier' WHERE "settings_active_tier" = 'cabinet';
   ALTER TYPE "public"."enum_tenants_settings_active_tier" RENAME TO "enum_tenants_settings_active_tier_final";
   CREATE TYPE "public"."enum_tenants_settings_active_tier" AS ENUM('vitrine', 'rdv', 'dossier', 'clinique');
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" DROP DEFAULT;
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" TYPE "public"."enum_tenants_settings_active_tier" USING "settings_active_tier"::text::"public"."enum_tenants_settings_active_tier";
   ALTER TABLE "public"."tenants" ALTER COLUMN "settings_active_tier" SET DEFAULT 'vitrine';
   DROP TYPE "public"."enum_tenants_settings_active_tier_final";`)
}
