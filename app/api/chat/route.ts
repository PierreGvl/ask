import { convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import { createChatStream } from "@/lib/chat/engine";
import type { ChatMessageMetadata } from "@/lib/chat/types";
import {
  ensureConversation,
  insertMessage,
  setConversationTitle,
  touchConversation,
} from "@/lib/db/queries";
import type { Citation, ToolCallTrace } from "@/lib/db/schema";
import { env } from "@/lib/env";
import {
  resolveProjectFeatures,
  resolveUserFeatures,
} from "@/lib/features/tiers";
import { generateTitle } from "@/lib/llm/title";
import type { DeclarationData } from "@/lib/pdf/types";
import { isProjectMember } from "@/lib/projects/access";
import { rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { resolveProject } from "@/lib/tenant/resolve";

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

  const project = await resolveProject();
  if (!project || project.status !== "active") {
    return new Response("Projet introuvable", { status: 404 });
  }

  const messages = parsed.data.messages as UIMessage[];
  const conversationId = parsed.data.conversationId;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const persist = Boolean(userId && conversationId);

  // Projet privé : accès réservé aux membres (le mode invité y est désactivé).
  if (project.accessMode === "private") {
    if (!userId || !(await isProjectMember(userId, project.id))) {
      return new Response("Accès réservé aux membres du projet", {
        status: 403,
      });
    }
  }

  // Rate-limit du mode invité (anonyme), par IP + projet, anti-abus.
  if (!userId && env.GUEST_RATE_LIMIT_PER_MIN > 0) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const now = Date.now();
    sweepRateLimits(now);
    const r = rateLimit(
      `guest:${project.id}:${ip}`,
      { limit: env.GUEST_RATE_LIMIT_PER_MIN, windowMs: 60_000 },
      now,
    );
    if (!r.ok) {
      return new Response("Trop de requêtes, réessayez plus tard.", {
        status: 429,
        headers: { "Retry-After": String(r.retryAfter) },
      });
    }
  }

  // Citations accumulées via les résultats d'outil (anti-doublon par titre).
  const collected: Citation[] = [];
  const toolTraces: ToolCallTrace[] = [];
  const seenSources = new Set<string>();
  const declarations: DeclarationData[] = [];

  if (persist) {
    await ensureConversation(conversationId!, project.id, userId!);
    await insertMessage({
      conversationId: conversationId!,
      role: "user",
      content: lastUserText(messages),
    });
  }

  // Bridage par palier : features de l'utilisateur connecté, sinon palier défaut.
  const features = userId
    ? await resolveUserFeatures(userId, project.id)
    : await resolveProjectFeatures(project.id);

  const result = await createChatStream({
    project,
    features,
    modelMessages: await convertToModelMessages(messages),
    collected,
    toolTraces,
    seenSources,
    declarations,
    onFinish: async (text) => {
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
      if (part.type === "finish") {
        const meta: ChatMessageMetadata = {};
        if (collected.length) meta.citations = collected;
        if (declarations.length) meta.declaration = declarations.at(-1);
        return meta;
      }
    },
    onError: (error) => {
      console.error("Erreur de streaming chat :", error);
      return "Une erreur est survenue lors de la génération de la réponse.";
    },
  });
}
