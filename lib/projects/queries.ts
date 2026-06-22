import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  type Project,
  type ProjectInvitation,
  type ProjectRole,
  projectInvitations,
  projectUsers,
  users,
} from "@/lib/db/schema";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/** URL publique de base d'un projet (domaine propre prioritaire). */
export function projectBaseUrl(project: Project): string {
  if (project.customDomain) return `https://${project.customDomain}`;
  return `https://${project.slug}.${env.APP_BASE_DOMAIN}`;
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

// --- Membres ---

export type MemberRow = {
  userId: string;
  email: string;
  name: string | null;
  role: ProjectRole;
  createdAt: Date;
};

export function listProjectMembers(projectId: string): Promise<MemberRow[]> {
  return db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      role: projectUsers.role,
      createdAt: projectUsers.createdAt,
    })
    .from(projectUsers)
    .innerJoin(users, eq(users.id, projectUsers.userId))
    .where(eq(projectUsers.projectId, projectId))
    .orderBy(desc(projectUsers.createdAt));
}

export async function countOwners(projectId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(projectUsers)
    .where(
      and(
        eq(projectUsers.projectId, projectId),
        eq(projectUsers.role, "owner"),
      ),
    );
  return row?.n ?? 0;
}

/** Ajoute (ou met à jour le rôle d') un membre. */
export async function upsertMember(
  projectId: string,
  userId: string,
  role: ProjectRole,
) {
  await db
    .insert(projectUsers)
    .values({ projectId, userId, role })
    .onConflictDoUpdate({
      target: [projectUsers.projectId, projectUsers.userId],
      set: { role },
    });
}

export async function setMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
) {
  await db
    .update(projectUsers)
    .set({ role })
    .where(
      and(
        eq(projectUsers.projectId, projectId),
        eq(projectUsers.userId, userId),
      ),
    );
}

export async function removeMember(projectId: string, userId: string) {
  await db
    .delete(projectUsers)
    .where(
      and(
        eq(projectUsers.projectId, projectId),
        eq(projectUsers.userId, userId),
      ),
    );
}

export function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

// --- Invitations ---

export type InvitationRow = Pick<
  ProjectInvitation,
  "id" | "email" | "role" | "createdAt" | "expiresAt"
>;

export function listPendingInvitations(
  projectId: string,
): Promise<InvitationRow[]> {
  return db
    .select({
      id: projectInvitations.id,
      email: projectInvitations.email,
      role: projectInvitations.role,
      createdAt: projectInvitations.createdAt,
      expiresAt: projectInvitations.expiresAt,
    })
    .from(projectInvitations)
    .where(
      and(
        eq(projectInvitations.projectId, projectId),
        isNull(projectInvitations.acceptedAt),
      ),
    )
    .orderBy(desc(projectInvitations.createdAt));
}

/** Crée une invitation et renvoie le token EN CLAIR (à mettre dans l'URL). */
export async function createInvitation(input: {
  projectId: string;
  email: string;
  role: ProjectRole;
  invitedBy: string;
  now: number;
}): Promise<{ token: string }> {
  const token = randomBytes(24).toString("base64url");
  await db.insert(projectInvitations).values({
    projectId: input.projectId,
    email: input.email.toLowerCase(),
    role: input.role,
    tokenHash: hashToken(token),
    invitedBy: input.invitedBy,
    expiresAt: new Date(input.now + INVITE_TTL_MS),
  });
  return { token };
}

export function getInvitationByTokenHash(tokenHash: string) {
  return db.query.projectInvitations.findFirst({
    where: eq(projectInvitations.tokenHash, tokenHash),
  });
}

export function isInvitationExpired(inv: { expiresAt: Date }): boolean {
  return inv.expiresAt.getTime() < Date.now();
}

export async function revokeInvitation(id: string) {
  await db.delete(projectInvitations).where(eq(projectInvitations.id, id));
}

/**
 * Marque l'invitation acceptée et crée l'appartenance, en une transaction.
 * Idempotent : si déjà membre, le rôle est mis à jour.
 */
export async function acceptInvitation(
  invitation: ProjectInvitation,
  userId: string,
  now: number,
) {
  await db.transaction(async (tx) => {
    await tx
      .insert(projectUsers)
      .values({
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
      })
      .onConflictDoUpdate({
        target: [projectUsers.projectId, projectUsers.userId],
        set: { role: invitation.role },
      });
    await tx
      .update(projectInvitations)
      .set({ acceptedAt: new Date(now) })
      .where(eq(projectInvitations.id, invitation.id));
  });
}

/** Accepte toutes les invitations en attente d'un email (au signup). */
export async function acceptPendingInvitationsForEmail(
  email: string,
  userId: string,
  now: number,
) {
  const pending = await db
    .select()
    .from(projectInvitations)
    .where(
      and(
        eq(projectInvitations.email, email.toLowerCase()),
        isNull(projectInvitations.acceptedAt),
      ),
    );
  for (const inv of pending) {
    if (inv.expiresAt.getTime() < now) continue;
    await acceptInvitation(inv, userId, now);
  }
}
