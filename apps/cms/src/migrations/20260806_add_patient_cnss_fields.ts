import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// CNSS/AMO (roadmap FSE/DMP) — champs optionnels sur patients :
// - cnss_registration_number (text) : numéro d'immatriculation CNSS/AMO,
//   clé de référence future de la FSE et du DMP. Aucune contrainte de format
//   stricte (la CNSS n'a pas publié de format canonique unique).
// - cnss_regime (varchar) : select indépendant / salarié / ayant droit /
//   étudiant — logique de remboursement différenciée par régime.
// - cnss_card_uploaded_at (timestamp) : traçabilité de l'upload de carte
//   (étape OCR future).
// Toutes les colonnes sont NULLABLE : rien ne bloque la création de patient
// sans données CNSS.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "patients"
    ADD COLUMN IF NOT EXISTS "cnss_registration_number" varchar,
    ADD COLUMN IF NOT EXISTS "cnss_regime" varchar,
    ADD COLUMN IF NOT EXISTS "cnss_card_uploaded_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "patients"
    DROP COLUMN IF EXISTS "cnss_registration_number",
    DROP COLUMN IF EXISTS "cnss_regime",
    DROP COLUMN IF EXISTS "cnss_card_uploaded_at";`)
}
