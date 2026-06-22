import { convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { createChatStream } from "@/lib/chat/engine";
import type { ChatMessageMetadata } from "@/lib/chat/types";
import type { Citation, ToolCallTrace } from "@/lib/db/schema";
import { resolveFeatures } from "@/lib/features/tiers";
import type { DeclarationData } from "@/lib/pdf/types";
import {
  authenticateWidget,
  corsHeaders,
  isOriginAllowed,
} from "@/lib/widget/auth";
import { enforceWidgetRateLimit } from "@/lib/widget/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ messages: z.array(z.any()) });

/** Préflight CORS. */
export async function OPTIONS(req: Request) {
  const auth = await authenticateWidget(req);
  const origin = req.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, auth?.allowedOrigins ?? []),
  });
}

export async function POST(req: Request) {
  const auth = await authenticateWidget(req);
  const origin = req.headers.get("origin");
  if (!auth) {
    return new Response("Clé API invalide", { status: 401 });
  }

  const cors = corsHeaders(origin, auth.allowedOrigins);
  if (!isOriginAllowed(origin, auth.allowedOrigins)) {
    return new Response("Origine non autorisée", { status: 403, headers: cors });
  }
  if (!resolveFeatures(auth.project).widget) {
    return new Response("Widget non activé pour ce projet", {
      status: 403,
      headers: cors,
    });
  }

  const limited = enforceWidgetRateLimit(auth.apiKeyId, cors);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Requête invalide", { status: 400, headers: cors });
  }
  const messages = parsed.data.messages as UIMessage[];

  // Mode invité : aucune persistance, scope = projet de la clé.
  const collected: Citation[] = [];
  const toolTraces: ToolCallTrace[] = [];
  const seenSources = new Set<string>();
  const declarations: DeclarationData[] = [];

  const result = await createChatStream({
    project: auth.project,
    modelMessages: await convertToModelMessages(messages),
    collected,
    toolTraces,
    seenSources,
    declarations,
  });

  return result.toUIMessageStreamResponse<UIMessage<ChatMessageMetadata>>({
    headers: cors,
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        const meta: ChatMessageMetadata = {};
        if (collected.length) meta.citations = collected;
        if (declarations.length) meta.declaration = declarations.at(-1);
        return meta;
      }
    },
    onError: (error) => {
      console.error("Erreur widget chat :", error);
      return "Une erreur est survenue lors de la génération de la réponse.";
    },
  });
}
