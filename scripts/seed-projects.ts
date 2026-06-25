/**
 * Seed / mise à jour des projets (tenants).
 *
 * Usage : npm run seed:projects
 *
 * Idempotent : upsert par slug. Renseigne la config complète du tenant
 * historique « winetech » (branding + prompt + suggestions) pour que tout le
 * métier soit piloté par la base, puis crée un 2e tenant d'exemple (hervai).
 */
import { config } from "dotenv";

config({ path: ".env" });

const WINETECH_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { projects, subscriptions } = await import("@/lib/db/schema");
  const { SYSTEM_PROMPT, GREETING, SUGGESTIONS } = await import(
    "@/lib/llm/prompts"
  );

  const winetech = {
    id: WINETECH_ID,
    slug: "winetech",
    name: "Ask by La Wine Tech",
    tier: "free" as const,
    theme: {
      colors: { navy: "#141934", rose: "#e33170", roseLight: "#fdeef4" },
      logoUrl: "/logo.png",
      wordmark: {
        parts: [
          { text: "Ask", color: "#141934" },
          { text: "By La", dim: true },
          { text: "WineTech", color: "#e33170" },
        ],
      },
    },
    config: {
      systemPrompt: SYSTEM_PROMPT,
      greeting: GREETING,
      suggestions: SUGGESTIONS,
      locale: "fr",
      defaultDomain: "reglementaire",
    },
  };

  // Upsert winetech (par slug).
  const existing = await db.query.projects.findFirst({
    where: eq(projects.slug, winetech.slug),
    columns: { id: true, theme: true },
  });
  if (existing) {
    // Préserve les assets gérés depuis la console (logo/favicon uploadés).
    const theme = {
      ...winetech.theme,
      ...(existing.theme?.logoUrl ? { logoUrl: existing.theme.logoUrl } : {}),
      ...(existing.theme?.faviconUrl
        ? { faviconUrl: existing.theme.faviconUrl }
        : {}),
    };
    await db
      .update(projects)
      .set({
        name: winetech.name,
        theme,
        config: winetech.config,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, existing.id));
    console.log(`✓ Projet « ${winetech.slug} » mis à jour.`);
  } else {
    await db.insert(projects).values(winetech);
    console.log(`✓ Projet « ${winetech.slug} » créé.`);
  }

  // Abonnement (source de vérité du tier) si absent.
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.projectId, WINETECH_ID),
    columns: { id: true },
  });
  if (!sub) {
    await db
      .insert(subscriptions)
      .values({ projectId: WINETECH_ID, tier: "free", provider: "manual" });
    console.log("✓ Abonnement winetech (free) créé.");
  }

  console.log("\n✅ Seed terminé.");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Seed échoué :", err);
  process.exit(1);
});
