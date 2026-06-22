import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiKeys,
  chunks,
  conversations,
  dataSources,
  documents,
  type LicenseTier,
  type ProjectConfig,
  projectCorpusSources,
  type ProjectTheme,
  projects,
  subscriptions,
  users,
} from "@/lib/db/schema";

// --- Lectures ---

export function listProjects() {
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export function getProjectById(id: string) {
  return db.query.projects.findFirst({ where: eq(projects.id, id) });
}

export function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isPlatformAdmin: users.isPlatformAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export function listSubscriptions(projectId: string) {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.projectId, projectId))
    .orderBy(desc(subscriptions.createdAt));
}

export function listDataSources(projectId: string) {
  return db
    .select()
    .from(dataSources)
    .where(eq(dataSources.projectId, projectId))
    .orderBy(desc(dataSources.createdAt));
}

export function listApiKeys(projectId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      allowedOrigins: apiKeys.allowedOrigins,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId))
    .orderBy(desc(apiKeys.createdAt));
}

/** Compteurs pour le tableau de bord. */
export async function overviewCounts() {
  const [[p], [u], [d], [c]] = await Promise.all([
    db.select({ n: count() }).from(projects),
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(documents),
    db.select({ n: count() }).from(conversations),
  ]);
  return { projects: p.n, users: u.n, documents: d.n, conversations: c.n };
}

/** Nombre de documents/chunks par projet (pour le détail). */
export async function projectStats(projectId: string) {
  const [[d], [c]] = await Promise.all([
    db
      .select({ n: count() })
      .from(documents)
      .where(eq(documents.projectId, projectId)),
    db
      .select({ n: count() })
      .from(chunks)
      .where(eq(chunks.projectId, projectId)),
  ]);
  return { documents: d.n, chunks: c.n };
}

// --- Mutations ---

export async function createProject(input: {
  slug: string;
  name: string;
  tier: LicenseTier;
  customDomain?: string | null;
}) {
  const [row] = await db
    .insert(projects)
    .values({
      slug: input.slug,
      name: input.name,
      tier: input.tier,
      customDomain: input.customDomain || null,
    })
    .returning({ id: projects.id });
  await db
    .insert(subscriptions)
    .values({ projectId: row.id, tier: input.tier, provider: "manual" });
  return row.id;
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    slug?: string;
    customDomain?: string | null;
    status?: "active" | "suspended";
    accessMode?: "public" | "private";
    theme?: ProjectTheme;
    config?: ProjectConfig;
  },
) {
  await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function setProjectAccessMode(
  id: string,
  accessMode: "public" | "private",
) {
  await db
    .update(projects)
    .set({ accessMode, updatedAt: new Date() })
    .where(eq(projects.id, id));
}

/** Change le tier : nouvel abonnement (vérité) + mise à jour du cache projet. */
export async function setProjectTier(projectId: string, tier: LicenseTier) {
  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.projectId, projectId));
  await db
    .insert(subscriptions)
    .values({ projectId, tier, provider: "manual" });
  await db
    .update(projects)
    .set({ tier, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function setUserPlatformAdmin(userId: string, value: boolean) {
  await db
    .update(users)
    .set({ isPlatformAdmin: value })
    .where(eq(users.id, userId));
}

export async function createDataSource(input: {
  projectId: string;
  kind: (typeof dataSources.kind.enumValues)[number];
  name: string;
  domain?: string | null;
  config?: Record<string, unknown>;
}) {
  await db.insert(dataSources).values({
    projectId: input.projectId,
    kind: input.kind,
    name: input.name,
    domain: input.domain || null,
    config: input.config,
  });
}

/** Marque une source « à resynchroniser » (le worker d'ingestion la traitera). */
export async function markDataSourceSyncing(id: string) {
  await db
    .update(dataSources)
    .set({ status: "syncing", lastError: null, updatedAt: new Date() })
    .where(eq(dataSources.id, id));
}

export async function deleteDataSource(id: string) {
  await db.delete(dataSources).where(eq(dataSources.id, id));
}

export async function insertApiKey(input: {
  projectId: string;
  name: string;
  keyHash: string;
  prefix: string;
  allowedOrigins: string[];
}) {
  await db.insert(apiKeys).values({
    projectId: input.projectId,
    name: input.name,
    keyHash: input.keyHash,
    prefix: input.prefix,
    allowedOrigins: input.allowedOrigins,
    scopes: ["chat"],
  });
}

export async function revokeApiKey(id: string) {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id));
}

// --- Sources de corpus partagées ---

export function listCorpusSources(projectId: string) {
  return db
    .select({
      sourceProjectId: projectCorpusSources.sourceProjectId,
      name: projects.name,
      slug: projects.slug,
    })
    .from(projectCorpusSources)
    .innerJoin(projects, eq(projects.id, projectCorpusSources.sourceProjectId))
    .where(eq(projectCorpusSources.projectId, projectId))
    .orderBy(projects.name);
}

export async function addCorpusSource(projectId: string, sourceProjectId: string) {
  if (projectId === sourceProjectId) return; // pas d'auto-référence
  await db
    .insert(projectCorpusSources)
    .values({ projectId, sourceProjectId })
    .onConflictDoNothing();
}

export async function removeCorpusSource(
  projectId: string,
  sourceProjectId: string,
) {
  await db
    .delete(projectCorpusSources)
    .where(
      and(
        eq(projectCorpusSources.projectId, projectId),
        eq(projectCorpusSources.sourceProjectId, sourceProjectId),
      ),
    );
}
