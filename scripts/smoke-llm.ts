/**
 * Smoke test de la couche LLM : une complétion + un embedding.
 * Usage : npm run llm:smoke
 */
import { config } from "dotenv";
import { embed, generateText } from "ai";

config({ path: ".env" });

async function main() {
  const { mistral, EMBEDDING_DIMENSIONS } = await import("@/lib/llm/models");

  console.log("→ Test génération de texte…");
  const { text } = await generateText({
    model: mistral(process.env.CHAT_MODEL ?? "mistral-large-latest"),
    prompt: "En une phrase, qu'est-ce qu'une appellation d'origine protégée ?",
  });
  console.log("✓ Réponse :", text.trim());

  console.log("\n→ Test embedding…");
  const { embedding } = await embed({
    model: mistral.textEmbeddingModel(
      process.env.EMBED_MODEL ?? "mistral-embed",
    ),
    value: "Réglementation des vins AOP en France",
  });
  console.log(
    `✓ Embedding de dimension ${embedding.length} (attendu ${EMBEDDING_DIMENSIONS})`,
  );
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Dimension d'embedding inattendue.");
  }
  console.log("\n✅ Smoke test OK");
}

main().catch((err) => {
  console.error("❌ Smoke test échoué :", err);
  process.exit(1);
});
