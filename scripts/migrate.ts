import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant.");
  process.exit(1);
}

async function main() {
  // Connexion dédiée à la migration (1 seule, pas de pool).
  const sql = postgres(url!, { max: 1 });

  // 1. Extensions (vector, pg_trgm) avant les migrations de schéma.
  const extSql = readFileSync(
    resolve(process.cwd(), "db/extensions.sql"),
    "utf8",
  );
  await sql.unsafe(extSql);
  console.log("✓ Extensions installées (vector, pg_trgm)");

  // 2. Migrations Drizzle.
  const dbm = drizzle(sql);
  await migrate(dbm, { migrationsFolder: "db/migrations" });
  console.log("✓ Migrations appliquées");

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
