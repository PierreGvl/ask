"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getProjectById, setProjectAccessMode } from "@/lib/admin/queries";
import { PROJECT_ROLES, type ProjectRole } from "@/lib/db/schema";
import { sendInvitationEmail } from "@/lib/email";
import { requireProjectManager } from "@/lib/projects/access";
import * as q from "@/lib/projects/queries";

export type ActionResult = { ok: boolean; error?: string };

function asRole(v: unknown): ProjectRole {
  return (PROJECT_ROLES as readonly string[]).includes(v as string)
    ? (v as ProjectRole)
    : "member";
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
  const manager = await requireProjectManager(projectId, "admin");
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return { ok: false, error: "Email invalide." };
  }
  const project = await getProjectById(projectId);
  if (!project) return { ok: false, error: "Projet introuvable." };

  // Déjà un compte dans CE projet ? (scopé tenant → aucune fuite cross-tenant).
  if (await q.findUserByProjectEmail(projectId, normalized)) {
    return { ok: false, error: "Cette personne est déjà membre." };
  }

  const { token } = await q.createInvitation({
    projectId,
    email: normalized,
    role: asRole(role),
    invitedBy: manager.kind === "tenant" ? manager.user.id : null,
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
  await requireProjectManager(projectId, "admin");
  await q.revokeInvitation(invitationId);
  revalidateMembers(projectId);
  return { ok: true };
}

export async function changeMemberRoleAction(
  projectId: string,
  userId: string,
  role: string,
): Promise<ActionResult> {
  await requireProjectManager(projectId, "admin");
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
  await requireProjectManager(projectId, "admin");
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
 * Acceptation par un user tenant connecté (du bon projet, email correspondant).
 * Le cas « pas encore inscrit » est géré au signup (acceptPendingInvitationsForEmail).
 */
export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.email ||
    session.user.kind !== "tenant"
  ) {
    return { ok: false, error: "Connexion requise." };
  }
  const inv = await q.getInvitationByTokenHash(q.hashToken(token));
  if (!inv || inv.acceptedAt) {
    return { ok: false, error: "Invitation invalide ou déjà utilisée." };
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Invitation expirée." };
  }
  if (session.user.projectId !== inv.projectId) {
    return { ok: false, error: "Invitation destinée à un autre espace." };
  }
  if (inv.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { ok: false, error: "Cette invitation vise une autre adresse email." };
  }
  await q.acceptInvitation(inv, session.user.id, Date.now());
  return { ok: true };
}

export async function setAccessModeAction(
  projectId: string,
  mode: string,
): Promise<ActionResult> {
  // Réglage sensible : owner du projet (ou admin console).
  await requireProjectManager(projectId, "owner");
  const next = mode === "private" ? "private" : "public";
  await setProjectAccessMode(projectId, next);
  revalidatePath("/manage/settings");
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}
