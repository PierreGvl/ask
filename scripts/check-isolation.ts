/**
 * Test de non-régression de l'ISOLATION multi-tenant.
 *
 * Usage : npm run check:isolation
 *
 * Sème deux projets éphémères (A, B) avec un chunk chacun, puis vérifie que
 * `retrieveChunks` scopé sur A ne renvoie JAMAIS de chunk de B (et inversement),
 * y compris pour une requête sémantiquement proche du corpus de l'autre tenant.
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
  const { projects, documents, chunks } = await import("@/lib/db/schema");
  const { embeddingModel } = await import("@/lib/llm/models");
  const { retrieveChunks } = await import("@/lib/rag/retrieve");

  // Nettoyage préventif d'un éventuel run précédent.
  await db
    .delete(projects)
    .where(inArray(projects.slug, [SLUG_A, SLUG_B]));

  async function seed(slug: string, name: string, text: string) {
    const [proj] = await db
      .insert(projects)
      .values({ slug, name, tier: "free" })
      .returning({ id: projects.id });
    const [doc] = await db
      .insert(documents)
      .values({
        projectId: proj.id,
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
        projectId: proj.id,
        documentId: doc.id,
        chunkIndex: 0,
        content: text,
        embedding,
        domain: "test",
      })
      .returning({ id: chunks.id });
    return { projectId: proj.id, chunkId: chunk.id };
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
      projectId: a.projectId,
      maxDistance: 1, // on désactive le seuil pour tester le filtre tenant seul
    });
    const fromB = await retrieveChunks(query, {
      projectId: b.projectId,
      maxDistance: 1,
    });

    // Tous les résultats de A appartiennent à A ; aucun chunk de B ne fuite.
    assert.ok(
      fromA.every((c) => c.chunkId !== b.chunkId),
      "FUITE : la recherche du projet A a renvoyé un chunk du projet B",
    );
    assert.ok(
      fromB.every((c) => c.chunkId !== a.chunkId),
      "FUITE : la recherche du projet B a renvoyé un chunk du projet A",
    );
    // Et chaque tenant retrouve bien SON propre chunk (sanity check).
    assert.ok(
      fromA.some((c) => c.chunkId === a.chunkId),
      "Le projet A ne retrouve pas son propre chunk",
    );
    assert.ok(
      fromB.some((c) => c.chunkId === b.chunkId),
      "Le projet B ne retrouve pas son propre chunk",
    );

    console.log("✅ Isolation OK : aucun chunk ne fuit entre tenants.");
  } finally {
    await db
      .delete(projects)
      .where(inArray(projects.slug, [SLUG_A, SLUG_B]));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Test d'isolation ÉCHOUÉ :", err.message ?? err);
  process.exit(1);
});
