import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  deleteConversation,
  getConversation,
  setConversationTitle,
} from "@/lib/db/queries";
import { resolveProject } from "@/lib/tenant/resolve";

export const runtime = "nodejs";

const patchSchema = z.object({ title: z.string().trim().min(1).max(120) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const project = await resolveProject();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  const { id } = await params;
  const owned = await getConversation(id, project.id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Titre invalide" }, { status: 400 });
  }

  await setConversationTitle(id, parsed.data.title);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const project = await resolveProject();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  const { id } = await params;
  await deleteConversation(id, project.id, session.user.id);
  return NextResponse.json({ ok: true });
}
