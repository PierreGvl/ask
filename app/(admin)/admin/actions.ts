"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/guard";
import { generateApiKey } from "@/lib/admin/api-keys";
import * as q from "@/lib/admin/queries";
import type { LicenseTier, ProjectConfig, ProjectTheme } from "@/lib/db/schema";

const TIERS: LicenseTier[] = ["free", "pro", "domaine"];

function asTier(v: FormDataEntryValue | null): LicenseTier {
  const s = String(v);
  return (TIERS as string[]).includes(s) ? (s as LicenseTier) : "free";
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function createProjectAction(formData: FormData) {
  await requirePlatformAdmin();
  const slug = str(formData.get("slug"));
  const name = str(formData.get("name"));
  if (!slug || !name) throw new Error("slug et name requis");
  const id = await q.createProject({
    slug,
    name,
    tier: asTier(formData.get("tier")),
    customDomain: str(formData.get("customDomain")) || null,
  });
  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${id}`);
}

export async function updateProjectAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = str(formData.get("id"));
  const existing = await q.getProjectById(id);
  if (!existing) throw new Error("projet introuvable");

  // Theme : on préserve le wordmark existant, on met à jour couleurs + logo.
  const colors: Record<string, string> = {};
  for (const key of ["navy", "rose", "roseLight"]) {
    const v = str(formData.get(`color_${key}`));
    if (v) colors[key] = v;
  }
  const theme: ProjectTheme = {
    ...(existing.theme ?? {}),
    colors: Object.keys(colors).length ? colors : existing.theme?.colors,
    logoUrl: str(formData.get("logoUrl")) || existing.theme?.logoUrl || null,
  };

  const suggestions = str(formData.get("suggestions"))
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const config: ProjectConfig = {
    ...(existing.config ?? {}),
    systemPrompt: str(formData.get("systemPrompt")) || undefined,
    greeting: str(formData.get("greeting")) || undefined,
    suggestions: suggestions.length ? suggestions : undefined,
    defaultDomain: str(formData.get("defaultDomain")) || undefined,
    searchToolDescription:
      str(formData.get("searchToolDescription")) || undefined,
  };

  await q.updateProject(id, {
    name: str(formData.get("name")) || existing.name,
    slug: str(formData.get("slug")) || existing.slug,
    customDomain: str(formData.get("customDomain")) || null,
    status: formData.get("status") === "suspended" ? "suspended" : "active",
    accessMode:
      formData.get("accessMode") === "private" ? "private" : "public",
    theme,
    config,
  });
  revalidatePath(`/admin/projects/${id}`);
}

export async function deleteProjectAction(formData: FormData) {
  await requirePlatformAdmin();
  await q.deleteProject(str(formData.get("id")));
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

export async function setTierAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = str(formData.get("id"));
  await q.setProjectTier(id, asTier(formData.get("tier")));
  revalidatePath(`/admin/projects/${id}`);
}

export async function toggleAdminAction(formData: FormData) {
  await requirePlatformAdmin();
  await q.setUserPlatformAdmin(
    str(formData.get("userId")),
    formData.get("value") === "true",
  );
  revalidatePath("/admin/users");
}

export async function createDataSourceAction(formData: FormData) {
  await requirePlatformAdmin();
  const projectId = str(formData.get("projectId"));
  await q.createDataSource({
    projectId,
    kind: str(formData.get("kind")) as never,
    name: str(formData.get("name")),
    domain: str(formData.get("domain")) || null,
  });
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function resyncDataSourceAction(formData: FormData) {
  await requirePlatformAdmin();
  await q.markDataSourceSyncing(str(formData.get("id")));
  revalidatePath(`/admin/projects/${str(formData.get("projectId"))}`);
}

export async function deleteDataSourceAction(formData: FormData) {
  await requirePlatformAdmin();
  await q.deleteDataSource(str(formData.get("id")));
  revalidatePath(`/admin/projects/${str(formData.get("projectId"))}`);
}

export async function revokeApiKeyAction(formData: FormData) {
  await requirePlatformAdmin();
  await q.revokeApiKey(str(formData.get("id")));
  revalidatePath(`/admin/projects/${str(formData.get("projectId"))}`);
}

export async function addCorpusSourceAction(formData: FormData) {
  await requirePlatformAdmin();
  const projectId = str(formData.get("projectId"));
  const sourceProjectId = str(formData.get("sourceProjectId"));
  if (sourceProjectId) await q.addCorpusSource(projectId, sourceProjectId);
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function removeCorpusSourceAction(formData: FormData) {
  await requirePlatformAdmin();
  const projectId = str(formData.get("projectId"));
  await q.removeCorpusSource(projectId, str(formData.get("sourceProjectId")));
  revalidatePath(`/admin/projects/${projectId}`);
}

/** Crée une clé API et RENVOIE le secret en clair (affiché une seule fois). */
export async function createApiKeyAction(
  projectId: string,
  name: string,
  origins: string,
): Promise<{ plaintext: string }> {
  await requirePlatformAdmin();
  const key = generateApiKey();
  await q.insertApiKey({
    projectId,
    name: name.trim() || "Clé widget",
    keyHash: key.keyHash,
    prefix: key.prefix,
    allowedOrigins: origins
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
  });
  revalidatePath(`/admin/projects/${projectId}`);
  return { plaintext: key.plaintext };
}
