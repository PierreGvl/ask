import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/** Une source citée dans une réponse de l'assistant. */
export type Citation = {
  n: number;
  title: string;
  url: string | null;
  reference: string | null;
};

export type ToolCallTrace = {
  name: string;
  args: Record<string, unknown>;
  resultCount?: number;
};

// --- Comptes utilisateurs (auth email/mot de passe, sessions JWT) ---
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Conversations (historique) ---
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Nouvelle conversation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("conversations_user_idx").on(t.userId, t.updatedAt)],
);

// --- Messages ---
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["user", "assistant", "system", "tool"],
    }).notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<Citation[]>(),
    toolCalls: jsonb("tool_calls").$type<ToolCallTrace[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.createdAt)],
);

// --- Documents source du RAG ---
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(), // 'legifrance' | 'inao' | 'eurlex' | 'upload'
  domain: text("domain").notNull().default("reglementaire"),
  title: text("title").notNull(),
  url: text("url"),
  reference: text("reference"), // n° article/règlement
  contentHash: text("content_hash").notNull(), // dédup / ré-ingestion idempotente
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Chunks vectorisés ---
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    // mistral-embed produit des vecteurs de dimension 1024
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    domain: text("domain").notNull().default("reglementaire"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => [
    // Index ANN HNSW (cosine) : meilleur compromis rappel/latence
    index("chunks_emb_hnsw").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    // Recherche plein texte française pour la branche lexicale (hybride)
    index("chunks_fts").using(
      "gin",
      sql`to_tsvector('french', ${t.content})`,
    ),
    index("chunks_domain_idx").on(t.domain),
  ],
);

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
