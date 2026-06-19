import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { hashApiKey } from "@/lib/admin/api-keys";
import { db } from "@/lib/db";
import { apiKeys, type Project, projects } from "@/lib/db/schema";

export type WidgetAuth = {
  project: Project;
  allowedOrigins: string[];
  apiKeyId: string;
};

/** Extrait la clé du header Authorization: Bearer … ou X-Ask-Key. */
function extractKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-ask-key");
}

/**
 * Authentifie une requête widget par clé API (hash SHA-256), charge le projet.
 * Retourne null si la clé est absente, inconnue ou révoquée.
 */
export async function authenticateWidget(
  req: Request,
): Promise<WidgetAuth | null> {
  const key = extractKey(req);
  if (!key) return null;

  const row = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, hashApiKey(key)), isNull(apiKeys.revokedAt)),
  });
  if (!row) return null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, row.projectId),
  });
  if (!project || project.status !== "active") return null;

  return {
    project,
    allowedOrigins: row.allowedOrigins ?? [],
    apiKeyId: row.id,
  };
}

/** En-têtes CORS : autorise l'origine seulement si elle est whitelistée. */
export function corsHeaders(
  origin: string | null,
  allowedOrigins: string[],
): Record<string, string> {
  const allowAll = allowedOrigins.length === 0;
  const ok = origin && (allowAll || allowedOrigins.includes(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ask-Key",
    Vary: "Origin",
  };
}

/** Vrai si l'origine de la requête est autorisée (ou si aucune restriction). */
export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[],
): boolean {
  if (allowedOrigins.length === 0) return true; // pas de restriction configurée
  return Boolean(origin && allowedOrigins.includes(origin));
}
