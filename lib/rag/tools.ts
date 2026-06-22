import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { Citation, ProjectFeatures } from "@/lib/db/schema";
import { assembleContext } from "./context";
import { retrieveChunks } from "./retrieve";
import { isWebSearchConfigured, searchWeb } from "./web-search";

export type SearchOutput = {
  context: string;
  citations: Citation[];
  found: number;
};
/** @deprecated alias historique, conservé pour compat. */
export type SearchRegulationOutput = SearchOutput;

const DEFAULT_SEARCH_DESCRIPTION =
  "Recherche des extraits dans la base documentaire de référence du projet pour fonder une réponse fiable et citée. À utiliser AVANT toute affirmation factuelle.";

/**
 * Fabrique d'outils agentiques, scopée au projet et gatée par licence.
 *
 *  - `search_documents` : RAG sur le corpus du tenant (toujours présent). Le
 *    `projectId` est lié par closure, jamais exposé au modèle (isolation).
 *  - `web_search` : recherche web de secours, présente uniquement si la licence
 *    l'autorise (features.webSearch) ET qu'un fournisseur est configuré.
 *
 * Ordre « docs d'abord » garanti côté route via `prepareStep` (web_search n'est
 * exposé qu'après une recherche documentaire infructueuse).
 */
export function buildTools(opts: {
  projectId: string;
  /** Corpus partagés lus en plus de celui du projet. */
  sharedProjectIds?: string[];
  defaultDomain?: string;
  features: ProjectFeatures;
  searchToolDescription?: string;
}): ToolSet {
  const searchDocuments = tool({
    description: opts.searchToolDescription ?? DEFAULT_SEARCH_DESCRIPTION,
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Requête de recherche, formulée pour maximiser la pertinence (mots-clés du domaine, références…).",
        ),
      domain: z
        .string()
        .optional()
        .describe("Filtre optionnel par sous-corpus. Omettre pour tout chercher."),
    }),
    execute: async ({ query, domain }): Promise<SearchOutput> => {
      const chunks = await retrieveChunks(query, {
        projectId: opts.projectId,
        sharedProjectIds: opts.sharedProjectIds,
        domain: domain ?? opts.defaultDomain,
      });
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

  const tools: ToolSet = {
    search_documents: searchDocuments,
  };

  if (opts.features.webSearch && isWebSearchConfigured()) {
    tools.web_search = tool({
      description:
        "Recherche sur internet, en SECOURS uniquement, quand la base documentaire ne couvre pas la question. Les résultats web ne font pas autorité : signale-le dans la réponse.",
      inputSchema: z.object({
        query: z.string().describe("Requête de recherche web."),
      }),
      execute: async ({ query }): Promise<SearchOutput> => searchWeb(query),
    });
  }

  if (opts.features.pdfGeneration) {
    tools.generate_declaration = tool({
      description:
        "Prépare une déclaration ou formalité administrative en PDF à partir d'informations structurées (déclaration de douane, attestation…). Demande à l'utilisateur les champs manquants AVANT d'appeler l'outil. Le document sera proposé au téléchargement.",
      inputSchema: z.object({
        title: z.string().describe("Titre du document, ex. 'Déclaration de douane'."),
        subtitle: z.string().optional().describe("Sous-titre / référence."),
        fields: z
          .array(
            z.object({
              label: z.string().describe("Intitulé du champ"),
              value: z.string().describe("Valeur renseignée"),
            }),
          )
          .describe("Liste des champs du document."),
        footer: z.string().optional().describe("Mention de pied de page."),
      }),
      execute: async (declaration) => ({
        ok: true,
        message:
          "Document prêt. Un bouton de téléchargement est proposé à l'utilisateur.",
        declaration,
      }),
    });
  }

  return tools;
}
