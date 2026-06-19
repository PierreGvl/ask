import "server-only";
import { env } from "@/lib/env";
import { rateLimit, sweepRateLimits } from "@/lib/rate-limit";

/**
 * Applique le rate-limit du widget, scopé par clé API (id). Retourne une
 * réponse 429 prête à renvoyer si la limite est dépassée, sinon null.
 */
export function enforceWidgetRateLimit(
  apiKeyId: string,
  corsHeaders: Record<string, string>,
): Response | null {
  if (env.WIDGET_RATE_LIMIT_PER_MIN <= 0) return null;
  const now = Date.now();
  sweepRateLimits(now);
  const r = rateLimit(
    `widget:${apiKeyId}`,
    { limit: env.WIDGET_RATE_LIMIT_PER_MIN, windowMs: 60_000 },
    now,
  );
  if (r.ok) return null;
  return new Response("Trop de requêtes, réessayez plus tard.", {
    status: 429,
    headers: { ...corsHeaders, "Retry-After": String(r.retryAfter) },
  });
}
