import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { type ProjectFeatures, projectPlans, users } from "@/lib/db/schema";

/**
 * Fonctionnalités effectives = celles du PALIER (project_plans). Plus de tier
 * free/pro/domaine : chaque palier déclare ses features incluses.
 *  - utilisateur connecté → features de son palier (users.planId) ;
 *  - invité / widget → features du palier PAR DÉFAUT du projet.
 */

const NO_FEATURES: ProjectFeatures = {
  customRag: false,
  webSearch: false,
  pdfGeneration: false,
  widget: false,
};

/** Preset d'un nouveau palier « Gratuit ». */
export const DEFAULT_PLAN_FEATURES: ProjectFeatures = {
  customRag: false,
  webSearch: true,
  pdfGeneration: false,
  widget: false,
};

function merge(features: Partial<ProjectFeatures> | null | undefined): ProjectFeatures {
  return { ...NO_FEATURES, ...(features ?? {}) };
}

/** Features du palier PAR DÉFAUT d'un projet (invité, widget). */
export async function resolveProjectFeatures(
  projectId: string,
): Promise<ProjectFeatures> {
  const plan = await db.query.projectPlans.findFirst({
    where: and(
      eq(projectPlans.projectId, projectId),
      eq(projectPlans.isDefault, true),
    ),
  });
  return merge(plan?.features);
}

/** Features du palier de l'utilisateur (fallback : palier par défaut du projet). */
export async function resolveUserFeatures(
  userId: string,
  projectId: string,
): Promise<ProjectFeatures> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { planId: true },
  });
  if (user?.planId) {
    const plan = await db.query.projectPlans.findFirst({
      where: eq(projectPlans.id, user.planId),
    });
    if (plan) return merge(plan.features);
  }
  return resolveProjectFeatures(projectId);
}
