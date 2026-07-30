import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tenants" ADD COLUMN "settings_calendar_token" varchar;
  ALTER TABLE "tenants" ADD COLUMN "settings_verification_token" varchar;
  ALTER TABLE "tenants" ADD COLUMN "settings_email_verified" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tenants" DROP COLUMN "settings_calendar_token";
  ALTER TABLE "tenants" DROP COLUMN "settings_verification_token";
  ALTER TABLE "tenants" DROP COLUMN "settings_email_verified";
  ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_index";`)
}
