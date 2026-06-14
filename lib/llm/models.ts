import { createMistral } from "@ai-sdk/mistral";
import { env } from "@/lib/env";

/**
 * Provider Mistral unique pour toute l'application (souveraineté EU).
 * La clé est validée via lib/env au démarrage.
 */
export const mistral = createMistral({ apiKey: env.MISTRAL_API_KEY });

/** Modèle de chat principal (raisonnement, réponses). */
export const chatModel = mistral(env.CHAT_MODEL);

/** Modèle léger/rapide pour les tâches utilitaires (titres de conversation). */
export const titleModel = mistral(env.TITLE_MODEL);

/** Modèle d'embeddings (1024 dimensions). */
export const embeddingModel = mistral.textEmbeddingModel(env.EMBED_MODEL);

export const EMBEDDING_DIMENSIONS = 1024;
