import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requirePlatformAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import {
  type PlatformAdmin,
  type ProjectRole,
  type User,
  users,
} from "@/lib/db/schema";

/**
 * Autorisation scopée projet. Les comptes sont cloisonnés par tenant : un user
 * appartient à exactement un projet (users.projectId) et porte son rôle
 * (users.role). Plus de "platform-admin = owner implicite" sur les tenants : les
 * admins console gèrent via la console (cf. requireProjectManager).
 */

const ROLE_RANK: Record<ProjectRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function canManageProject(role: ProjectRole | null): boolean {
  return role === "owner" || role === "admin";
}

/** Rôle de l'utilisateur SUR ce projet (null s'il appartient à un autre projet). */
export async function getProjectRole(
  userId: string,
  projectId: string,
): Promise<ProjectRole | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.projectId !== projectId) return null;
  return user.role;
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
 * Exige une session TENANT du projet courant avec au moins le rôle `min`.
 * Codes alignés sur requirePlatformAdmin pour les layouts (UNAUTHENTICATED →
 * /login ; FORBIDDEN → 404).
 */
export async function requireProjectRole(
  projectId: string,
  min: ProjectRole,
): Promise<ProjectAccess> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.kind !== "tenant" || session.user.projectId !== projectId) {
    throw new Error("FORBIDDEN");
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user || user.projectId !== projectId) throw new Error("FORBIDDEN");
  if (ROLE_RANK[user.role] < ROLE_RANK[min]) throw new Error("FORBIDDEN");
  return { user, role: user.role };
}

export type ProjectManager =
  | { kind: "console"; admin: PlatformAdmin }
  | { kind: "tenant"; user: User; role: ProjectRole };

/**
 * Autorise la GESTION d'un projet par un admin console (depuis la console) OU
 * un user tenant de rôle ≥ `min` (depuis /manage). Permet aux actions membres
 * partagées de tourner des deux surfaces.
 */
export async function requireProjectManager(
  projectId: string,
  min: ProjectRole = "admin",
): Promise<ProjectManager> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.kind === "console") {
    const admin = await requirePlatformAdmin();
    return { kind: "console", admin };
  }
  const access = await requireProjectRole(projectId, min);
  return { kind: "tenant", user: access.user, role: access.role };
}
