import { embed } from "ai";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { embeddingModel } from "@/lib/llm/models";

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  content: string;
  title: string;
  url: string | null;
  reference: string | null;
  distance: number | null; // distance cosine (0 = identique ; null si trouvé seulement par le full-text)
  score: number; // score RRF combiné
};

/** Convertit un vecteur JS en littéral pgvector ('[a,b,c]'). */
function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/**
 * Recherche hybride sur les chunks :
 *  - branche vectorielle (cosine, HNSW)
 *  - branche lexicale (full-text français)
 *  - fusion Reciprocal Rank Fusion (RRF, k=60)
 *
 * Renvoie les meilleurs chunks dont la distance vectorielle passe le seuil
 * (anti-bruit). Si aucun ne passe, renvoie un tableau vide → l'assistant
 * doit alors signaler l'absence de source.
 */
export async function retrieveChunks(
  query: string,
  opts: {
    /** Corpus à interroger : corpus privé du tenant + partagés abonnés. */
    corpusIds: string[];
    domain?: string;
    topK?: number;
    maxDistance?: number;
  },
): Promise<RetrievedChunk[]> {
  // L'isolation se fait sur corpus_id : un corpus est l'unité de données RAG.
  // Les IDs proviennent toujours du contexte serveur (project_corpora), jamais
  // d'un argument du modèle.
  if (opts.corpusIds.length === 0) return [];
  // Littéral tableau Postgres ('{uuid1,uuid2}') passé en UN seul paramètre :
  // drizzle développerait un tableau JS en liste de params (record), ce qui
  // casse le cast ::uuid[]. Les IDs proviennent de la base (sûrs).
  const corpusIdsLiteral = `{${opts.corpusIds.join(",")}}`;
  const topK = opts.topK ?? env.RAG_TOP_K;
  const maxDistance = opts.maxDistance ?? env.RAG_MAX_DISTANCE;
  const domain = opts.domain ?? null;
  const candidates = Math.max(topK * 3, 20);

  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
    maxRetries: 2,
  });
  const vec = toVectorLiteral(embedding);

  const rows = await db.execute<{
    chunk_id: string;
    document_id: string;
    content: string;
    title: string;
    url: string | null;
    reference: string | null;
    distance: number;
    rrf: number;
  }>(sql`
    WITH vec AS (
      SELECT id,
             (embedding <=> ${vec}::vector) AS distance,
             row_number() OVER (ORDER BY embedding <=> ${vec}::vector) AS rnk
      FROM chunks
      WHERE corpus_id = ANY(${corpusIdsLiteral}::uuid[])
        AND (${domain}::text IS NULL OR domain = ${domain})
      ORDER BY embedding <=> ${vec}::vector
      LIMIT ${candidates}
    ),
    fts AS (
      SELECT id,
             row_number() OVER (
               ORDER BY ts_rank(to_tsvector('french', content),
                                plainto_tsquery('french', ${query})) DESC
             ) AS rnk
      FROM chunks
      WHERE corpus_id = ANY(${corpusIdsLiteral}::uuid[])
        AND to_tsvector('french', content) @@ plainto_tsquery('french', ${query})
        AND (${domain}::text IS NULL OR domain = ${domain})
      LIMIT ${candidates}
    )
    SELECT c.id AS chunk_id,
           c.document_id,
           c.content,
           d.title,
           d.url,
           d.reference,
           vec.distance AS distance,
           (COALESCE(1.0 / (60 + vec.rnk), 0) +
            COALESCE(1.0 / (60 + fts.rnk), 0)) AS rrf
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    LEFT JOIN vec ON vec.id = c.id
    LEFT JOIN fts ON fts.id = c.id
    WHERE vec.id IS NOT NULL OR fts.id IS NOT NULL
    ORDER BY rrf DESC
    LIMIT ${topK}
  `);

  return rows
    .map((r) => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      content: r.content,
      title: r.title,
      url: r.url,
      reference: r.reference,
      distance: r.distance ?? null,
      score: r.rrf,
    }))
    // Garde-fou : on écarte les chunks trop éloignés sémantiquement.
    // (un chunk trouvé uniquement par le FTS a distance=null → on le garde)
    .filter((c) => c.distance == null || c.distance <= maxDistance);
}
