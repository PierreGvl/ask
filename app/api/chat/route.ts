import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import type { ChatMessageMetadata } from "@/lib/chat/types";
import {
  ensureConversation,
  insertMessage,
  setConversationTitle,
  touchConversation,
} from "@/lib/db/queries";
import type { Citation, ToolCallTrace } from "@/lib/db/schema";
import { chatModel } from "@/lib/llm/models";
import { SYSTEM_PROMPT } from "@/lib/llm/prompts";
import { generateTitle } from "@/lib/llm/title";
import type { SearchRegulationOutput } from "@/lib/rag/tools";
import { ragTools } from "@/lib/rag/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()),
  conversationId: z.string().uuid().optional(),
});

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  return last.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Requête invalide", { status: 400 });
  }

  const messages = parsed.data.messages as UIMessage[];
  const conversationId = parsed.data.conversationId;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const persist = Boolean(userId && conversationId);

  // Citations accumulées via les résultats d'outil (anti-doublon par titre).
  const collected: Citation[] = [];
  const toolTraces: ToolCallTrace[] = [];
  const seenSources = new Set<string>();

  if (persist) {
    await ensureConversation(conversationId!, userId!);
    await insertMessage({
      conversationId: conversationId!,
      role: "user",
      content: lastUserText(messages),
    });
  }

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: ragTools,
    // Plafond serré : limite les allers-retours (donc les appels Mistral) pour
    // éviter de saturer la limite de débit de l'API sur les questions complexes.
    stopWhen: stepCountIs(3),
    temperature: 0.2,
    // Reprises automatiques (backoff) sur erreurs transitoires, dont les 429.
    maxRetries: 2,
    onStepFinish: (step) => {
      for (const tr of step.toolResults ?? []) {
        if (tr.toolName !== "search_regulation") continue;
        const out = tr.output as SearchRegulationOutput;
        toolTraces.push({
          name: tr.toolName,
          args: (tr.input ?? {}) as Record<string, unknown>,
          resultCount: out.found,
        });
        for (const c of out.citations ?? []) {
          const key = `${c.title}|${c.reference ?? ""}`;
          if (seenSources.has(key)) continue;
          seenSources.add(key);
          collected.push({ ...c, n: collected.length + 1 });
        }
      }
    },
    onFinish: async ({ text }) => {
      if (!persist) return;
      try {
        await insertMessage({
          conversationId: conversationId!,
          role: "assistant",
          content: text,
          citations: collected.length ? collected : undefined,
          toolCalls: toolTraces.length ? toolTraces : undefined,
        });
        await touchConversation(conversationId!);

        // Titre auto au premier échange (titre encore par défaut).
        if (messages.filter((m) => m.role === "user").length === 1) {
          const title = await generateTitle(lastUserText(messages), text);
          if (title) await setConversationTitle(conversationId!, title);
        }
      } catch (err) {
        console.error("Persistance du message échouée :", err);
      }
    },
  });

  return result.toUIMessageStreamResponse<UIMessage<ChatMessageMetadata>>({
    messageMetadata: ({ part }) => {
      if (part.type === "finish" && collected.length) {
        return { citations: collected };
      }
    },
    onError: (error) => {
      console.error("Erreur de streaming chat :", error);
      return "Une erreur est survenue lors de la génération de la réponse.";
    },
  });
}
