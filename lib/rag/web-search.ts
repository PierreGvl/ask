import "server-only";
import type { Citation } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Recherche web de secours, SOUVERAINE EU et pluggable.
 *
 * Fournisseurs supportés (cf. WEB_SEARCH_PROVIDER) :
 *  - 'brave'   : Brave Search API (UE, indépendant) — BRAVE_API_KEY
 *  - 'searxng' : méta-moteur auto-hébergé — SEARXNG_URL
 *  - 'none'    : désactivé (l'outil renvoie alors une absence gracieuse)
 *
 * La sortie a la MÊME forme que la recherche documentaire ({context, citations,
 * found}) pour s'intégrer sans friction à la chaîne (numérotation [n], collecte
 * des citations dans la route). Les citations portent `kind: 'web'`.
 */

export type WebSearchOutput = {
  context: string;
  citations: Citation[];
  found: number;
};

type RawResult = { title: string; url: string; snippet: string };

/** Indique si un fournisseur web est réellement configuré. */
export function isWebSearchConfigured(): boolean {
  if (env.WEB_SEARCH_PROVIDER === "brave") return Boolean(env.BRAVE_API_KEY);
  if (env.WEB_SEARCH_PROVIDER === "searxng") return Boolean(env.SEARXNG_URL);
  return false;
}

async function braveSearch(query: string, topK: number): Promise<RawResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(topK));
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": env.BRAVE_API_KEY!,
    },
  });
  if (!res.ok) throw new Error(`Brave API ${res.status}`);
  const data = (await res.json()) as {
    web?: { results?: { title: string; url: string; description?: string }[] };
  };
  return (data.web?.results ?? []).slice(0, topK).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description ?? "",
  }));
}

async function searxngSearch(
  query: string,
  topK: number,
): Promise<RawResult[]> {
  const url = new URL("/search", env.SEARXNG_URL!);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SearxNG ${res.status}`);
  const data = (await res.json()) as {
    results?: { title: string; url: string; content?: string }[];
  };
  return (data.results ?? []).slice(0, topK).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content ?? "",
  }));
}

/** Recherche web et assemblage au format contexte/citations numérotés. */
export async function searchWeb(
  query: string,
  opts: { topK?: number } = {},
): Promise<WebSearchOutput> {
  const topK = opts.topK ?? 5;
  if (!isWebSearchConfigured()) {
    return { context: "Recherche web non configurée.", citations: [], found: 0 };
  }

  const results =
    env.WEB_SEARCH_PROVIDER === "brave"
      ? await braveSearch(query, topK)
      : await searxngSearch(query, topK);

  if (results.length === 0) {
    return { context: "Aucun résultat web pertinent.", citations: [], found: 0 };
  }

  const citations: Citation[] = results.map((r, i) => ({
    n: i + 1,
    title: r.title,
    url: r.url,
    reference: null,
    kind: "web",
  }));

  const context = results
    .map((r, i) => `[${i + 1}] (${r.title} — ${r.url})\n${r.snippet}`)
    .join("\n\n");

  return { context, citations, found: results.length };
}
