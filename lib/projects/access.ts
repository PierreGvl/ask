import "server-only";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  type ProjectRole,
  type User,
  projectUsers,
  users,
} from "@/lib/db/schema";

/**
 * Autorisation scopée projet, bâtie sur `project_users`.
 *
 * Comme `lib/admin/guard.ts`, le rôle est lu en base à chaque appel (pas dans le
 * JWT) → révocation immédiate. Un platform-admin est traité comme `owner`
 * implicite sur TOUS les projets.
 */

const ROLE_RANK: Record<ProjectRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function canManageProject(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin";
}

/** Rôle effectif de l'utilisateur sur le projet (owner si platform-admin). */
export async function getProjectRole(
  userId: string,
  projectId: string,
): Promise<ProjectRole | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;
  if (user.isPlatformAdmin) return "owner";

  const membership = await db.query.projectUsers.findFirst({
    where: and(
      eq(projectUsers.userId, userId),
      eq(projectUsers.projectId, projectId),
    ),
  });
  return membership?.role ?? null;
}

/** Appartenance simple (pour le gating du chat privé). */
export async function isProjectMember(
  userId: string,
  projectId: string,
): Promise<boolean> {
  return (await getProjectRole(userId, projectId)) !== null;
}

export type ProjectAccess = { user: User; role: ProjectRole };

/**
 * Exige une session dont l'utilisateur possède au moins le rôle `min` sur le
 * projet. Codes alignés sur `requirePlatformAdmin` pour un traitement commun
 * dans les layouts (`UNAUTHENTICATED` → /login ; `FORBIDDEN` → 404).
 */
export async function requireProjectRole(
  projectId: string,
  min: ProjectRole,
): Promise<ProjectAccess> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) throw new Error("UNAUTHENTICATED");

  const role: ProjectRole | null = user.isPlatformAdmin
    ? "owner"
    : ((
        await db.query.projectUsers.findFirst({
          where: and(
            eq(projectUsers.userId, user.id),
            eq(projectUsers.projectId, projectId),
          ),
        })
      )?.role ?? null);

  if (!role || ROLE_RANK[role] < ROLE_RANK[min]) {
    throw new Error("FORBIDDEN");
  }
  return { user, role };
}
