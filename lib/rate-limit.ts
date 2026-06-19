import "server-only";

/**
 * Rate-limiting fenêtre fixe, EN MÉMOIRE. Suffisant pour un déploiement
 * mono-instance (VPS Coolify). En multi-instance, remplacer le Map par un
 * store partagé (Redis/Upstash) — l'interface `rateLimit` reste identique.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number; // secondes
};

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
  now: number,
): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: opts.limit - 1, resetAt, retryAfter: 0 };
  }
  existing.count += 1;
  const ok = existing.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
    retryAfter: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Purge opportuniste des buckets expirés (évite la croissance mémoire). */
export function sweepRateLimits(now: number): void {
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}
