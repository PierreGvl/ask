"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getProjectById } from "@/lib/admin/queries";
import type { ProjectRole } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { canManageProject, requireProjectRole } from "@/lib/projects/access";
import * as q from "@/lib/projects/queries";

export type ActionResult = { ok: boolean; error?: string };

const ROLES: ProjectRole[] = ["owner", "admin", "member"];

function asRole(v: unknown): ProjectRole {
  return ROLES.includes(v as ProjectRole) ? (v as ProjectRole) : "member";
}

/** Revalide les deux surfaces qui affichent les membres. */
function revalidateMembers(projectId: string) {
  revalidatePath("/manage/members");
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function inviteMemberAction(
  projectId: string,
  email: string,
  role: string,
): Promise<ActionResult> {
  const { user } = await requireProjectRole(projectId, "admin");
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return { ok: false, error: "Email invalide." };
  }
  const project = await getProjectById(projectId);
  if (!project) return { ok: false, error: "Projet introuvable." };

  // Déjà membre ? on évite l'invitation redondante.
  const existing = await q.findUserByEmail(normalized);
  if (existing) {
    const current = await q.listProjectMembers(projectId);
    if (current.some((m) => m.userId === existing.id)) {
      return { ok: false, error: "Cette personne est déjà membre." };
    }
  }

  const { token } = await q.createInvitation({
    projectId,
    email: normalized,
    role: asRole(role),
    invitedBy: user.id,
    now: Date.now(),
  });
  const inviteUrl = `${q.projectBaseUrl(project)}/invite/${token}`;

  try {
    await sendInvitationEmail({
      to: normalized,
      projectName: project.name,
      inviteUrl,
      role: asRole(role),
    });
  } catch (err) {
    console.error("Envoi d'invitation échoué :", err);
    return { ok: false, error: "L'email n'a pas pu être envoyé." };
  }

  revalidateMembers(projectId);
  return { ok: true };
}

export async function revokeInvitationAction(
  projectId: string,
  invitationId: string,
): Promise<ActionResult> {
  await requireProjectRole(projectId, "admin");
  await q.revokeInvitation(invitationId);
  revalidateMembers(projectId);
  return { ok: true };
}

export async function changeMemberRoleAction(
  projectId: string,
  userId: string,
  role: string,
): Promise<ActionResult> {
  await requireProjectRole(projectId, "admin");
  const next = asRole(role);
  const members = await q.listProjectMembers(projectId);
  const target = members.find((m) => m.userId === userId);
  if (!target) return { ok: false, error: "Membre introuvable." };

  // Garde-fou : ne pas rétrograder le dernier owner.
  if (target.role === "owner" && next !== "owner") {
    if ((await q.countOwners(projectId)) <= 1) {
      return { ok: false, error: "Impossible de rétrograder le dernier owner." };
    }
  }
  await q.setMemberRole(projectId, userId, next);
  revalidateMembers(projectId);
  return { ok: true };
}

export async function removeMemberAction(
  projectId: string,
  userId: string,
): Promise<ActionResult> {
  await requireProjectRole(projectId, "admin");
  const members = await q.listProjectMembers(projectId);
  const target = members.find((m) => m.userId === userId);
  if (!target) return { ok: false, error: "Membre introuvable." };

  if (target.role === "owner" && (await q.countOwners(projectId)) <= 1) {
    return { ok: false, error: "Impossible de retirer le dernier owner." };
  }
  await q.removeMember(projectId, userId);
  revalidateMembers(projectId);
  return { ok: true };
}

/**
 * Acceptation d'une invitation par un utilisateur déjà connecté dont l'email
 * correspond. (Le cas « pas encore inscrit » est géré au signup, cf.
 * acceptPendingInvitationsForEmail dans /api/register.)
 */
export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false, error: "Connexion requise." };
  }
  const inv = await q.getInvitationByTokenHash(q.hashToken(token));
  if (!inv || inv.acceptedAt) {
    return { ok: false, error: "Invitation invalide ou déjà utilisée." };
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Invitation expirée." };
  }
  if (inv.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return {
      ok: false,
      error: "Cette invitation vise une autre adresse email.",
    };
  }
  await q.acceptInvitation(inv, session.user.id, Date.now());
  return { ok: true };
}

export async function setAccessModeAction(
  projectId: string,
  mode: string,
): Promise<ActionResult> {
  // Réglage sensible : owner (ou platform-admin) uniquement.
  const access = await requireProjectRole(projectId, "owner");
  if (!canManageProject(access.role)) return { ok: false };
  const next = mode === "private" ? "private" : "public";
  const { setProjectAccessMode } = await import("@/lib/admin/queries");
  await setProjectAccessMode(projectId, next);
  revalidatePath("/manage/settings");
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}
