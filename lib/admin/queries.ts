import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, max } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiKeys,
  type BillingModel,
  chunks,
  conversations,
  corpora,
  dataSources,
  type DeliveryMode,
  documents,
  type ProjectConfig,
  projectCorpora,
  type ProjectFeatures,
  projectPlans,
  type ProjectTheme,
  type ProjectType,
  projects,
  subscriptions,
  users,
} from "@/lib/db/schema";
import { DEFAULT_PLAN_FEATURES } from "@/lib/features/tiers";

// --- Projets (tenants) ---

export function listProjects() {
  return db.select().from(projects).orderBy(asc(projects.number));
}

export function getProjectById(id: string) {
  return db.query.projects.findFirst({ where: eq(projects.id, id) });
}

export function listSubscriptions(projectId: string) {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.projectId, projectId))
    .orderBy(desc(subscriptions.createdAt));
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
  const [[p], [co], [u], [c]] = await Promise.all([
    db.select({ n: count() }).from(projects),
    db.select({ n: count() }).from(corpora),
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(conversations),
  ]);
  return { projects: p.n, corpora: co.n, users: u.n, conversations: c.n };
}

/** Docs/chunks lus par un tenant (agrégés sur ses corpus). */
export async function projectStats(projectId: string) {
  const cs = await db
    .select({ id: projectCorpora.corpusId })
    .from(projectCorpora)
    .where(eq(projectCorpora.projectId, projectId));
  const ids = cs.map((c) => c.id);
  if (ids.length === 0) return { documents: 0, chunks: 0 };
  const [[d], [c]] = await Promise.all([
    db.select({ n: count() }).from(documents).where(inArray(documents.corpusId, ids)),
    db.select({ n: count() }).from(chunks).where(inArray(chunks.corpusId, ids)),
  ]);
  return { documents: d.n, chunks: c.n };
}

/** accessMode dérivé du type commercial : seul le B2B est privé. */
export function accessModeForType(type: ProjectType): "public" | "private" {
  return type === "b2b" ? "private" : "public";
}

export async function createProject(input: {
  slug: string;
  name: string;
  type: ProjectType;
  deliveryMode: DeliveryMode;
  customDomain?: string | null;
}) {
  const [{ m }] = await db.select({ m: max(projects.number) }).from(projects);
  const number = (m ?? 0) + 1;
  const [row] = await db
    .insert(projects)
    .values({
      slug: input.slug,
      name: input.name,
      number,
      type: input.type,
      deliveryMode: input.deliveryMode,
      accessMode: accessModeForType(input.type),
      billingModel: input.type === "b2b" ? "company" : "end_user",
      customDomain: input.customDomain || null,
    })
    .returning({ id: projects.id });
  // Palier par défaut « Gratuit » (invité/widget) + corpus privé du tenant.
  await db.insert(projectPlans).values({
    projectId: row.id,
    name: "Gratuit",
    priceCents: 0,
    features: DEFAULT_PLAN_FEATURES,
    isDefault: true,
    sortOrder: 0,
  });
  await createTenantCorpus(row.id, input.slug, input.name);
  return row.id;
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    slug?: string;
    customDomain?: string | null;
    status?: "active" | "suspended";
    type?: ProjectType;
    accessMode?: "public" | "private";
    deliveryMode?: DeliveryMode;
    billingModel?: BillingModel;
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

// --- Paliers d'offre (project_plans) ---

export function listProjectPlans(projectId: string) {
  return db
    .select()
    .from(projectPlans)
    .where(eq(projectPlans.projectId, projectId))
    .orderBy(asc(projectPlans.sortOrder), asc(projectPlans.priceCents));
}

export async function createPlan(input: {
  projectId: string;
  name: string;
  priceCents: number;
  description?: string | null;
  features: Partial<ProjectFeatures>;
}) {
  await db.insert(projectPlans).values({
    projectId: input.projectId,
    name: input.name,
    priceCents: input.priceCents,
    description: input.description || null,
    features: input.features,
  });
}

export async function updatePlan(
  id: string,
  patch: {
    name?: string;
    priceCents?: number;
    description?: string | null;
    features?: Partial<ProjectFeatures>;
  },
) {
  await db.update(projectPlans).set(patch).where(eq(projectPlans.id, id));
}

export async function deletePlan(id: string) {
  await db.delete(projectPlans).where(eq(projectPlans.id, id));
}

/** Marque un palier par défaut (un seul par projet). */
export async function setDefaultPlan(projectId: string, planId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(projectPlans)
      .set({ isDefault: false })
      .where(eq(projectPlans.projectId, projectId));
    await tx
      .update(projectPlans)
      .set({ isDefault: true })
      .where(eq(projectPlans.id, planId));
  });
}

export async function setUserPlan(userId: string, planId: string | null) {
  await db.update(users).set({ planId }).where(eq(users.id, userId));
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

// --- Corpus ---

export function listCorpora() {
  return db
    .select({
      id: corpora.id,
      slug: corpora.slug,
      name: corpora.name,
      description: corpora.description,
      ownerProjectId: corpora.ownerProjectId,
      ownerName: projects.name,
      createdAt: corpora.createdAt,
    })
    .from(corpora)
    .leftJoin(projects, eq(projects.id, corpora.ownerProjectId))
    .orderBy(desc(corpora.createdAt));
}

export function getCorpusById(id: string) {
  return db.query.corpora.findFirst({ where: eq(corpora.id, id) });
}

export function listCorpusDataSources(corpusId: string) {
  return db
    .select()
    .from(dataSources)
    .where(eq(dataSources.corpusId, corpusId))
    .orderBy(desc(dataSources.createdAt));
}

export async function corpusStats(corpusId: string) {
  const [[d], [c], [li]] = await Promise.all([
    db.select({ n: count() }).from(documents).where(eq(documents.corpusId, corpusId)),
    db.select({ n: count() }).from(chunks).where(eq(chunks.corpusId, corpusId)),
    db
      .select({ last: max(documents.ingestedAt) })
      .from(documents)
      .where(eq(documents.corpusId, corpusId)),
  ]);
  return { documents: d.n, chunks: c.n, lastIngestedAt: li.last ?? null };
}

/** Tenants qui LISENT ce corpus (pour « Utilisé par »). */
export function corpusReaders(corpusId: string) {
  return db
    .select({ id: projects.id, name: projects.name, slug: projects.slug })
    .from(projectCorpora)
    .innerJoin(projects, eq(projects.id, projectCorpora.projectId))
    .where(eq(projectCorpora.corpusId, corpusId))
    .orderBy(projects.name);
}

/** Corpus LUS par un tenant (privé + partagés abonnés). */
export function listProjectCorpora(projectId: string) {
  return db
    .select({
      corpusId: corpora.id,
      name: corpora.name,
      slug: corpora.slug,
      ownerProjectId: corpora.ownerProjectId,
    })
    .from(projectCorpora)
    .innerJoin(corpora, eq(corpora.id, projectCorpora.corpusId))
    .where(eq(projectCorpora.projectId, projectId))
    .orderBy(corpora.name);
}

/** Corpus PARTAGÉS (bibliothèques de domaine, owner null). */
export function listSharedCorpora() {
  return db
    .select({ id: corpora.id, name: corpora.name, slug: corpora.slug })
    .from(corpora)
    .where(isNull(corpora.ownerProjectId))
    .orderBy(corpora.name);
}

export async function createSharedCorpus(input: {
  slug: string;
  name: string;
  description?: string | null;
}) {
  const [row] = await db
    .insert(corpora)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description || null,
      ownerProjectId: null,
    })
    .returning({ id: corpora.id });
  return row.id;
}

export async function createTenantCorpus(
  projectId: string,
  slug: string,
  name: string,
) {
  const [row] = await db
    .insert(corpora)
    .values({ slug, name, ownerProjectId: projectId })
    .returning({ id: corpora.id });
  await db
    .insert(projectCorpora)
    .values({ projectId, corpusId: row.id })
    .onConflictDoNothing();
  return row.id;
}

export async function linkProjectCorpus(projectId: string, corpusId: string) {
  await db
    .insert(projectCorpora)
    .values({ projectId, corpusId })
    .onConflictDoNothing();
}

export async function unlinkProjectCorpus(projectId: string, corpusId: string) {
  await db
    .delete(projectCorpora)
    .where(
      and(
        eq(projectCorpora.projectId, projectId),
        eq(projectCorpora.corpusId, corpusId),
      ),
    );
}

// --- Sources de données (d'un corpus) ---

export async function createDataSource(input: {
  corpusId: string;
  kind: (typeof dataSources.kind.enumValues)[number];
  name: string;
  description?: string | null;
  domain?: string | null;
  config?: Record<string, unknown>;
}) {
  await db.insert(dataSources).values({
    corpusId: input.corpusId,
    kind: input.kind,
    name: input.name,
    description: input.description || null,
    domain: input.domain || null,
    config: input.config,
  });
}

/** Marque une source « à resynchroniser » (l'ingestion réelle est CLI). */
export async function markDataSourceSyncing(id: string) {
  await db
    .update(dataSources)
    .set({ status: "syncing", lastError: null, updatedAt: new Date() })
    .where(eq(dataSources.id, id));
}

export async function deleteDataSource(id: string) {
  await db.delete(dataSources).where(eq(dataSources.id, id));
}
