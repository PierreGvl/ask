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

// --- Membres (= comptes tenant du projet) ---

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
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.projectId, projectId))
    .orderBy(desc(users.createdAt));
}

export async function countOwners(projectId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.projectId, projectId), eq(users.role, "owner")));
  return row?.n ?? 0;
}

export async function setMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
) {
  await db
    .update(users)
    .set({ role })
    .where(and(eq(users.id, userId), eq(users.projectId, projectId)));
}

/** Retire un membre = SUPPRIME son compte tenant (conversations en cascade). */
export async function removeMember(projectId: string, userId: string) {
  await db
    .delete(users)
    .where(and(eq(users.id, userId), eq(users.projectId, projectId)));
}

/** Compte tenant identifié par (projectId, email). */
export function findUserByProjectEmail(projectId: string, email: string) {
  return db.query.users.findFirst({
    where: and(
      eq(users.projectId, projectId),
      eq(users.email, email.toLowerCase()),
    ),
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
  invitedBy: string | null;
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

/** Vrai s'il existe une invitation en attente (non expirée) pour cet email. */
export async function hasPendingInvitation(
  projectId: string,
  email: string,
  now: number,
): Promise<boolean> {
  const rows = await db
    .select({ expiresAt: projectInvitations.expiresAt })
    .from(projectInvitations)
    .where(
      and(
        eq(projectInvitations.projectId, projectId),
        eq(projectInvitations.email, email.toLowerCase()),
        isNull(projectInvitations.acceptedAt),
      ),
    );
  return rows.some((r) => r.expiresAt.getTime() >= now);
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
 * Acceptation : applique le rôle de l'invitation au compte tenant `userId`
 * (qui appartient déjà au projet) et marque l'invitation acceptée.
 */
export async function acceptInvitation(
  invitation: ProjectInvitation,
  userId: string,
  now: number,
) {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ role: invitation.role })
      .where(
        and(eq(users.id, userId), eq(users.projectId, invitation.projectId)),
      );
    await tx
      .update(projectInvitations)
      .set({ acceptedAt: new Date(now) })
      .where(eq(projectInvitations.id, invitation.id));
  });
}

/**
 * Accepte les invitations en attente d'un email POUR CE PROJET (au signup).
 * Scopé projet : une invitation d'un autre tenant ne concerne pas ce compte.
 */
export async function acceptPendingInvitationsForEmail(
  projectId: string,
  email: string,
  userId: string,
  now: number,
) {
  const pending = await db
    .select()
    .from(projectInvitations)
    .where(
      and(
        eq(projectInvitations.projectId, projectId),
        eq(projectInvitations.email, email.toLowerCase()),
        isNull(projectInvitations.acceptedAt),
      ),
    );
  for (const inv of pending) {
    if (inv.expiresAt.getTime() < now) continue;
    await acceptInvitation(inv, userId, now);
  }
}
