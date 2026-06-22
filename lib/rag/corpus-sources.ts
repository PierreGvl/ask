import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectCorpusSources } from "@/lib/db/schema";

/**
 * IDs des projets dont `projectId` peut lire le corpus EN PLUS du sien.
 * Lecture unidirectionnelle : ne renvoie que les sources configurées pour CE
 * projet, jamais l'inverse. Utilisé dans le chemin chaud de récupération RAG.
 */
export async function getCorpusSourceIds(projectId: string): Promise<string[]> {
  const rows = await db
    .select({ id: projectCorpusSources.sourceProjectId })
    .from(projectCorpusSources)
    .where(eq(projectCorpusSources.projectId, projectId));
  return rows.map((r) => r.id);
}
