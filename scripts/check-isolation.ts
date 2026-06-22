/**
 * Test de non-régression de l'ISOLATION par corpus.
 *
 * Usage : npm run check:isolation
 *
 * Sème deux corpus éphémères (A, B) avec un chunk chacun, puis vérifie que
 * `retrieveChunks` scopé sur A ne renvoie JAMAIS de chunk de B (et inversement),
 * y compris pour une requête sémantiquement proche du corpus de l'autre.
 * Nettoie tout en sortie. Nécessite DATABASE_URL + MISTRAL_API_KEY.
 */
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: ".env" });

const SLUG_A = "__iso_test_a";
const SLUG_B = "__iso_test_b";

async function main() {
  const { embed } = await import("ai");
  const { inArray } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { corpora, documents, chunks } = await import("@/lib/db/schema");
  const { embeddingModel } = await import("@/lib/llm/models");
  const { retrieveChunks } = await import("@/lib/rag/retrieve");

  // Nettoyage préventif d'un éventuel run précédent.
  await db.delete(corpora).where(inArray(corpora.slug, [SLUG_A, SLUG_B]));

  async function seed(slug: string, name: string, text: string) {
    const [corpus] = await db
      .insert(corpora)
      .values({ slug, name })
      .returning({ id: corpora.id });
    const [doc] = await db
      .insert(documents)
      .values({
        corpusId: corpus.id,
        source: "upload",
        domain: "test",
        title: `${slug}-doc`,
        contentHash: `${slug}-hash`,
      })
      .returning({ id: documents.id });
    const { embedding } = await embed({ model: embeddingModel, value: text });
    const [chunk] = await db
      .insert(chunks)
      .values({
        corpusId: corpus.id,
        documentId: doc.id,
        chunkIndex: 0,
        content: text,
        embedding,
        domain: "test",
      })
      .returning({ id: chunks.id });
    return { corpusId: corpus.id, chunkId: chunk.id };
  }

  try {
    const a = await seed(
      SLUG_A,
      "Iso A",
      "Le pinot noir est un cépage rouge de Bourgogne.",
    );
    const b = await seed(
      SLUG_B,
      "Iso B",
      "Le chardonnay est un cépage blanc de Bourgogne.",
    );

    // Requête volontairement proche des DEUX corpus (cépage de Bourgogne).
    const query = "Quel cépage de Bourgogne ?";

    const fromA = await retrieveChunks(query, {
      corpusIds: [a.corpusId],
      maxDistance: 1, // on désactive le seuil pour tester le filtre corpus seul
    });
    const fromB = await retrieveChunks(query, {
      corpusIds: [b.corpusId],
      maxDistance: 1,
    });

    assert.ok(
      fromA.every((c) => c.chunkId !== b.chunkId),
      "FUITE : la recherche du corpus A a renvoyé un chunk du corpus B",
    );
    assert.ok(
      fromB.every((c) => c.chunkId !== a.chunkId),
      "FUITE : la recherche du corpus B a renvoyé un chunk du corpus A",
    );
    assert.ok(
      fromA.some((c) => c.chunkId === a.chunkId),
      "Le corpus A ne retrouve pas son propre chunk",
    );
    assert.ok(
      fromB.some((c) => c.chunkId === b.chunkId),
      "Le corpus B ne retrouve pas son propre chunk",
    );

    console.log("✅ Isolation OK : aucun chunk ne fuit entre corpus.");
  } finally {
    await db.delete(corpora).where(inArray(corpora.slug, [SLUG_A, SLUG_B]));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Test d'isolation ÉCHOUÉ :", err.message ?? err);
  process.exit(1);
});
