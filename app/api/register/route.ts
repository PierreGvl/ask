import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/validation";
import { isConsoleHost } from "@/lib/console";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  acceptPendingInvitationsForEmail,
  hasPendingInvitation,
} from "@/lib/projects/queries";
import { resolveProject } from "@/lib/tenant/resolve";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Pas d'inscription publique sur la console (staff uniquement).
  if (await isConsoleHost()) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  // Le compte est cloisonné au tenant résolu par le host.
  const project = await resolveProject();
  if (!project || project.status !== "active") {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Projet privé : inscription sur INVITATION uniquement (pas d'ouverture libre).
  if (
    project.accessMode === "private" &&
    !(await hasPendingInvitation(project.id, normalizedEmail, Date.now()))
  ) {
    return NextResponse.json(
      { error: "L'inscription à cet espace se fait sur invitation." },
      { status: 403 },
    );
  }

  // Unicité scopée au projet : une existence ici ne révèle rien d'un autre tenant.
  const existing = await db.query.users.findFirst({
    where: and(
      eq(users.projectId, project.id),
      eq(users.email, normalizedEmail),
    ),
  });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({
      projectId: project.id,
      email: normalizedEmail,
      passwordHash,
      name: name ?? null,
      role: "member",
    })
    .returning({ id: users.id });

  // Rattache les invitations en attente pour cet email DANS CE PROJET.
  try {
    await acceptPendingInvitationsForEmail(
      project.id,
      normalizedEmail,
      created.id,
      Date.now(),
    );
  } catch (err) {
    console.error("Acceptation des invitations au signup échouée :", err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
