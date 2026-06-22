/**
 * Extrait le corpus réglementaire du vin dans un projet-bibliothèque dédié,
 * partagé (lecture) avec les tenants qui en ont besoin (winetech, hervai…).
 *
 * Usage : npm run seed:shared-corpus
 *
 * Idempotent :
 *  - upsert du projet « Corpus réglementaire du vin » (slug vin-reglementaire,
 *    suspended → jamais servi comme tenant, sert uniquement de source) ;
 *  - déplace les documents + chunks de winetech vers ce projet (no-op après) ;
 *  - lie winetech ET hervai à cette source ; retire l'ancien lien hervai→winetech.
 */
import { config } from "dotenv";

config({ path: ".env" });

const CORPUS_ID = "00000000-0000-0000-0000-000000000002";

async function main() {
  const { and, eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { projects, documents, chunks, projectCorpusSources } = await import(
    "@/lib/db/schema"
  );

  const bySlug = (slug: string) =>
    db.query.projects.findFirst({
      where: eq(projects.slug, slug),
      columns: { id: true },
    });

  // 1) Projet-bibliothèque (suspended : non routable comme tenant).
  const existing = await bySlug("vin-reglementaire");
  if (!existing) {
    await db.insert(projects).values({
      id: CORPUS_ID,
      slug: "vin-reglementaire",
      name: "Corpus réglementaire du vin",
      status: "suspended",
      tier: "free",
      config: { defaultDomain: "reglementaire" },
    });
    console.log("✓ Projet « vin-reglementaire » créé (bibliothèque partagée).");
  } else if (existing.id !== CORPUS_ID) {
    console.log(
      `ℹ︎ vin-reglementaire existe déjà (id ${existing.id}). On l'utilise.`,
    );
  }
  const corpusId = existing?.id ?? CORPUS_ID;

  // 2) Déplacer le corpus winetech → bibliothèque (idempotent).
  const winetech = await bySlug("winetech");
  if (winetech) {
    const movedDocs = await db
      .update(documents)
      .set({ projectId: corpusId })
      .where(eq(documents.projectId, winetech.id))
      .returning({ id: documents.id });
    const movedChunks = await db
      .update(chunks)
      .set({ projectId: corpusId })
      .where(eq(chunks.projectId, winetech.id))
      .returning({ id: chunks.id });
    console.log(
      `✓ Déplacé ${movedDocs.length} doc(s) / ${movedChunks.length} chunk(s) vers la bibliothèque.`,
    );
  }

  // 3) Lier les tenants à la source partagée.
  const link = async (slug: string) => {
    const p = await bySlug(slug);
    if (!p) {
      console.log(`ℹ︎ ${slug} absent, lien ignoré.`);
      return;
    }
    await db
      .insert(projectCorpusSources)
      .values({ projectId: p.id, sourceProjectId: corpusId })
      .onConflictDoNothing();
    // Nettoyer un éventuel ancien lien direct vers winetech.
    if (winetech) {
      await db
        .delete(projectCorpusSources)
        .where(
          and(
            eq(projectCorpusSources.projectId, p.id),
            eq(projectCorpusSources.sourceProjectId, winetech.id),
          ),
        );
    }
    console.log(`✓ ${slug} → vin-reglementaire (corpus partagé).`);
  };
  await link("winetech");
  await link("hervai");

  console.log("\n✅ Corpus réglementaire partagé en place.");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Échec :", err);
  process.exit(1);
});
