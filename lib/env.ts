import { z } from "zod";

/**
 * Validation centralisée des variables d'environnement.
 * Échoue tôt (au démarrage) plutôt qu'au premier appel runtime.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),

  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),

  MISTRAL_API_KEY: z.string().min(1),
  CHAT_MODEL: z.string().default("mistral-large-latest"),
  TITLE_MODEL: z.string().default("mistral-small-latest"),
  EMBED_MODEL: z.string().default("mistral-embed"),

  RAG_MAX_DISTANCE: z.coerce.number().default(0.7),
  RAG_TOP_K: z.coerce.number().int().positive().default(8),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Variables d'environnement invalides :\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
