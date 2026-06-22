import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectCorpora } from "@/lib/db/schema";

/**
 * IDs des corpus LUS par un tenant : son corpus privé + les corpus partagés
 * (bibliothèques de domaine) auxquels il est abonné. Sert au filtre d'isolation
 * du RAG (`corpus_id = ANY(...)`).
 */
export async function getCorpusIdsForProject(
  projectId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: projectCorpora.corpusId })
    .from(projectCorpora)
    .where(eq(projectCorpora.projectId, projectId));
  return rows.map((r) => r.id);
}
