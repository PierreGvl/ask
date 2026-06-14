import type { Citation } from "@/lib/db/schema";
import type { RetrievedChunk } from "./retrieve";

export type AssembledContext = {
  /** Bloc texte numéroté [1]…[n] à injecter dans le prompt. */
  contextText: string;
  /** Citations correspondantes (mapping n → source). */
  citations: Citation[];
};

/**
 * Transforme une liste de chunks récupérés en un bloc de contexte numéroté
 * et la liste de citations associée. Les chunks d'un même document sont
 * regroupés sous une même citation pour éviter les doublons.
 */
export function assembleContext(chunks: RetrievedChunk[]): AssembledContext {
  if (chunks.length === 0) {
    return { contextText: "", citations: [] };
  }

  // Un numéro de citation par document (dédup).
  const docToN = new Map<string, number>();
  const citations: Citation[] = [];

  for (const c of chunks) {
    if (!docToN.has(c.documentId)) {
      const n = citations.length + 1;
      docToN.set(c.documentId, n);
      citations.push({
        n,
        title: c.title,
        url: c.url,
        reference: c.reference,
      });
    }
  }

  const blocks = chunks.map((c) => {
    const n = docToN.get(c.documentId)!;
    const ref = c.reference ? ` — ${c.reference}` : "";
    return `[${n}] (${c.title}${ref})\n${c.content.trim()}`;
  });

  return { contextText: blocks.join("\n\n"), citations };
}
