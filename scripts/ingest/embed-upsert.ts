import { embedMany } from "ai";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chunks, documents } from "@/lib/db/schema";
import { embeddingModel } from "@/lib/llm/models";
import type { Chunk } from "./chunk";

const BATCH = 48;

async function embedBatched(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    let attempt = 0;
    for (;;) {
      try {
        const { embeddings } = await embedMany({
          model: embeddingModel,
          values: slice,
        });
        out.push(...embeddings);
        break;
      } catch (err) {
        attempt++;
        if (attempt > 5) throw err;
        const wait = 2 ** attempt * 500;
        console.warn(
          `  ⚠ embed batch ${i / BATCH} échec (tentative ${attempt}), retry dans ${wait}ms`,
        );
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    process.stdout.write(
      `\r  embeddings : ${Math.min(i + BATCH, texts.length)}/${texts.length}`,
    );
  }
  process.stdout.write("\n");
  return out;
}

export type UpsertInput = {
  projectId: string;
  source: string;
  domain: string;
  title: string;
  url: string | null;
  reference: string | null;
  contentHash: string;
  chunks: Chunk[];
};

/**
 * Upsert idempotent d'un document et de ses chunks, scopé au projet.
 * - Dédup par (projectId, title) : deux tenants peuvent avoir un doc homonyme.
 * - Si un document de même hash existe → skip (rien n'a changé).
 * - Si le document existe avec un hash différent → purge + ré-insertion.
 */
export async function upsertDocument(
  doc: UpsertInput,
): Promise<"skipped" | "ingested"> {
  const existing = await db.query.documents.findFirst({
    where: and(
      eq(documents.projectId, doc.projectId),
      eq(documents.title, doc.title),
    ),
  });

  if (existing && existing.contentHash === doc.contentHash) {
    return "skipped";
  }
  if (existing) {
    await db.delete(documents).where(eq(documents.id, existing.id)); // cascade chunks
  }

  const embeddings = await embedBatched(doc.chunks.map((c) => c.content));

  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(documents)
      .values({
        projectId: doc.projectId,
        source: doc.source,
        domain: doc.domain,
        title: doc.title,
        url: doc.url,
        reference: doc.reference,
        contentHash: doc.contentHash,
      })
      .returning({ id: documents.id });

    const rows = doc.chunks.map((c, i) => ({
      projectId: doc.projectId,
      documentId: inserted.id,
      chunkIndex: c.index,
      content: c.content,
      tokenCount: c.tokenCount,
      embedding: embeddings[i],
      domain: doc.domain,
    }));

    for (let i = 0; i < rows.length; i += 200) {
      await tx.insert(chunks).values(rows.slice(i, i + 200));
    }
  });

  return "ingested";
}
