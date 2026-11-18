import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Database connection.
 *
 * - DATABASE_URL set   → connects to that Postgres (Supabase, Azure, Neon, RDS…)
 * - DATABASE_URL unset → embedded Postgres (PGlite) stored in ./data/pglite,
 *                        so local development needs no database install.
 *
 * Migrations in ./drizzle are applied automatically on first use.
 */

/** Common Postgres interface shared by both drivers. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function connectPostgres(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const db = drizzle(new Pool({ connectionString: url, max: 5 }), { schema });
  await migrate(db, { migrationsFolder });
  return db;
}

async function connectPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), "data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder });
  return db;
}

// Cache on globalThis so dev-mode hot reloads reuse one connection.
const g = globalThis as unknown as { __adnaDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__adnaDb) {
    const url = process.env.DATABASE_URL;
    g.__adnaDb = (url ? connectPostgres(url) : connectPglite()).catch((err) => {
      g.__adnaDb = undefined;
      throw err;
    });
  }
  return g.__adnaDb;
}

export { schema };
