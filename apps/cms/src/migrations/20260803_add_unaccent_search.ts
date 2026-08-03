import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Phase B — B5 : recherche patients diacritic-insensitive.
// - unaccent : « elodie » trouve « Élodie » (folding des accents, y compris
//   les harakat arabes)
// - pg_trgm : index trigramme → ILIKE rapide + tolérance aux fautes
//   (ORDER BY similarity dans l'endpoint /api/patients/search)
//
// NOTE Postgres managé : CREATE EXTENSION exige un rôle privilégié (superuser
// ou extension « trusted »). Sur Supabase / Neon / RDS, activer unaccent et
// pg_trgm dans la console de l'hébergeur si cette migration échoue avec
// « permission denied to create extension ».

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    -- unaccent est IMMUTABLE : l'index d'expression est légal et sert
    -- unaccent(full_name) ILIKE unaccent(...) ainsi que la similarité.
    CREATE INDEX IF NOT EXISTS "patients_full_name_unaccent_trgm_idx"
      ON "patients" USING gin (unaccent("full_name") gin_trgm_ops);
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "patients_full_name_unaccent_trgm_idx";
  `)
}
