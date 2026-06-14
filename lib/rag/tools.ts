import { tool } from "ai";
import { z } from "zod";
import type { Citation } from "@/lib/db/schema";
import { assembleContext } from "./context";
import { retrieveChunks } from "./retrieve";

export type SearchRegulationOutput = {
  context: string;
  citations: Citation[];
  found: number;
};

/**
 * Outil agentique de recherche documentaire (RAG).
 *
 * Le modèle décide quand l'appeler et peut l'appeler plusieurs fois en
 * reformulant pour décomposer une question complexe. Le résultat contient
 * le contexte numéroté et les citations, que l'UI affiche sous la réponse.
 *
 * L'architecture est extensible : ajouter d'autres outils ici (ex.
 * get_appellation_rules, web_search…) suffit à étendre les capacités sans
 * toucher au reste de la chaîne.
 */
export const searchRegulationTool = tool({
  description:
    "Recherche des extraits de documents de référence (réglementation, appellations, œnologie…) pour fonder une réponse fiable et citée. À utiliser avant toute affirmation factuelle ou réglementaire.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "La requête de recherche, formulée pour maximiser la pertinence documentaire (mots-clés du domaine, références d'articles…).",
      ),
    domain: z
      .string()
      .optional()
      .describe(
        "Filtre optionnel par domaine (ex. 'reglementaire'). Omettre pour chercher partout.",
      ),
  }),
  execute: async ({ query, domain }): Promise<SearchRegulationOutput> => {
    const chunks = await retrieveChunks(query, { domain });
    const { contextText, citations } = assembleContext(chunks);
    return {
      context:
        contextText ||
        "Aucun extrait pertinent trouvé dans la base documentaire.",
      citations,
      found: chunks.length,
    };
  },
});

export const ragTools = {
  search_regulation: searchRegulationTool,
};
