// Apply database migrations explicitly (they also run automatically on first request).
// Usage: DATABASE_URL=... npm run db:migrate
import path from "node:path";

async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle(pool), { migrationsFolder });
    await pool.end();
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), "data", "pglite");
    (await import("node:fs")).mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    await migrate(drizzle(client), { migrationsFolder });
    await client.close();
  }
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
