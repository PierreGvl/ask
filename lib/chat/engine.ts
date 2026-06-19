import "server-only";
import {
  type ModelMessage,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { resolveFeatures } from "@/lib/features/tiers";
import type { Citation, Project, ToolCallTrace } from "@/lib/db/schema";
import { chatModel } from "@/lib/llm/models";
import { buildSystemPrompt } from "@/lib/llm/prompts";
import { buildTools, type SearchOutput } from "@/lib/rag/tools";
import { isWebSearchConfigured } from "@/lib/rag/web-search";
import type { DeclarationData } from "@/lib/pdf/types";

/**
 * Cœur partagé du chat (app standalone ET widget). Configure le streaming
 * Mistral avec la politique « docs d'abord puis web », scopé au projet, et
 * collecte les citations (avec provenance doc/web) dans `collected`.
 *
 * La persistance (historique) reste à la charge de l'appelant via `onFinish`.
 */
export function createChatStream(opts: {
  project: Project;
  modelMessages: ModelMessage[];
  collected: Citation[];
  toolTraces: ToolCallTrace[];
  seenSources: Set<string>;
  /** Déclarations générées (tier Domaine), exposées en métadonnée message. */
  declarations?: DeclarationData[];
  onFinish?: (text: string) => Promise<void> | void;
}) {
  const { project, collected, toolTraces, seenSources } = opts;
  const features = resolveFeatures(project);
  const webEnabled = features.webSearch && isWebSearchConfigured();
  const pdfEnabled = features.pdfGeneration;

  const tools: ToolSet = buildTools({
    projectId: project.id,
    defaultDomain: project.config?.defaultDomain,
    features,
    searchToolDescription: project.config?.searchToolDescription,
  });

  return streamText({
    model: chatModel,
    system: buildSystemPrompt({
      persona: project.config?.systemPrompt,
      webSearch: webEnabled,
    }),
    messages: opts.modelMessages,
    tools,
    // Politique « docs d'abord » : tour 0 limité à search_documents ; web_search
    // exposé au tour 1 seulement si la base n'a rien donné ; sinon réponse forcée.
    stopWhen: stepCountIs(webEnabled ? 3 : 2),
    prepareStep: ({ stepNumber, steps }) => {
      if (stepNumber === 0) {
        // Tour 0 : recherche documentaire (+ action de génération si Domaine).
        // Jamais le web d'emblée (docs d'abord).
        const active = ["search_documents"];
        if (pdfEnabled) active.push("generate_declaration");
        return { activeTools: active };
      }
      if (!webEnabled) return { toolChoice: "none" };
      const results = steps.flatMap((s) => s.toolResults ?? []);
      const docsFound = results
        .filter((r) => r.toolName === "search_documents")
        .some((r) => (r.output as SearchOutput).found > 0);
      const webUsed = results.some((r) => r.toolName === "web_search");
      if (stepNumber === 1 && !docsFound && !webUsed) {
        return { activeTools: ["web_search"] };
      }
      return { toolChoice: "none" };
    },
    temperature: 0.2,
    maxRetries: 2,
    onStepFinish: (step) => {
      for (const tr of step.toolResults ?? []) {
        if (tr.toolName === "generate_declaration") {
          const out = tr.output as { declaration?: DeclarationData };
          if (out.declaration) opts.declarations?.push(out.declaration);
          continue;
        }
        if (tr.toolName !== "search_documents" && tr.toolName !== "web_search")
          continue;
        const out = tr.output as SearchOutput;
        toolTraces.push({
          name: tr.toolName,
          args: (tr.input ?? {}) as Record<string, unknown>,
          resultCount: out.found,
        });
        for (const c of out.citations ?? []) {
          const kind = c.kind ?? "doc";
          const key = `${kind}|${c.title}|${c.url ?? c.reference ?? ""}`;
          if (seenSources.has(key)) continue;
          seenSources.add(key);
          collected.push({ ...c, kind, n: collected.length + 1 });
        }
      }
    },
    onFinish: opts.onFinish
      ? async ({ text }) => {
          await opts.onFinish!(text);
        }
      : undefined,
  });
}
