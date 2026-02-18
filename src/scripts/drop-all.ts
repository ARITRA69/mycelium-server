import { sql } from "@/db/postgresql";

async function drop_all() {
  await sql.unsafe(`
    DO $$ DECLARE
      r record;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;

      FOR r IN (
        SELECT typname FROM pg_type
        JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE pg_namespace.nspname = 'public' AND pg_type.typtype = 'e'
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$
  `);

  console.log("Dropped all tables, indexes, and enum types.");
  process.exit(0);
}

drop_all();
