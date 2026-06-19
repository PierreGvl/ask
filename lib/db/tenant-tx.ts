import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Exécute un bloc dans une transaction où le GUC `app.project_id` est positionné
 * (via set_config, local à la transaction). C'est le crochet nécessaire si l'on
 * ACTIVE la RLS Postgres (cf. db/rls.sql) : les policies filtrent alors sur
 * current_setting('app.project_id').
 *
 * Non utilisé tant que la RLS n'est pas activée (l'isolation repose aujourd'hui
 * sur la couche applicative). Fourni prêt à l'emploi pour le durcissement.
 */
export async function withTenant<T>(
  projectId: string,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.project_id', ${projectId}, true)`,
    );
    return fn(tx);
  });
}
