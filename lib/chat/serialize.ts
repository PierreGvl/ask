import type { ChatUIMessage } from "@/lib/chat/types";
import type { Message } from "@/lib/db/schema";

/** Convertit les messages stockés en base en messages UI pour useChat. */
export function toUIMessages(rows: Message[]): ChatUIMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      parts: [{ type: "text", text: r.content }],
      metadata: r.citations ? { citations: r.citations } : undefined,
    }));
}
