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

    -- PG 18 marque unaccent() STABLE (pas IMMUTABLE) : un index d'expression
    -- direct sur unaccent(full_name) est rejeté (« functions in index
    -- expression must be marked IMMUTABLE » — attrapé par le test de preview).
    -- Wrapper IMMUTABLE : l'index et les requêtes (endpoint /patients/search)
    -- passent par lui, le planificateur peut utiliser l'index.
    CREATE OR REPLACE FUNCTION public.f_unaccent(text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    STRICT
    AS $func$
      SELECT public.unaccent('public.unaccent', $1);
    $func$;

    CREATE INDEX IF NOT EXISTS "patients_full_name_unaccent_trgm_idx"
      ON "patients" USING gin (public.f_unaccent("full_name") gin_trgm_ops);
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "patients_full_name_unaccent_trgm_idx";
    DROP FUNCTION IF EXISTS public.f_unaccent(text);
  `)
}
