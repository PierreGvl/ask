import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  type Citation,
  conversations,
  messages,
  type ToolCallTrace,
} from "@/lib/db/schema";

export async function listConversations(userId: string) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(id: string, userId: string) {
  return db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
  });
}

export async function getMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

/** Crée la conversation si elle n'existe pas encore (idempotent sur l'id). */
export async function ensureConversation(id: string, userId: string) {
  await db
    .insert(conversations)
    .values({ id, userId })
    .onConflictDoNothing({ target: conversations.id });
}

export async function insertMessage(input: {
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  citations?: Citation[];
  toolCalls?: ToolCallTrace[];
}) {
  await db.insert(messages).values({
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    citations: input.citations ?? null,
    toolCalls: input.toolCalls ?? null,
  });
}

export async function touchConversation(id: string) {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));
}

export async function setConversationTitle(id: string, title: string) {
  await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, id));
}

export async function deleteConversation(id: string, userId: string) {
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}
