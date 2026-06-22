import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/validation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { acceptPendingInvitationsForEmail } from "@/lib/projects/queries";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
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
    .values({ email: normalizedEmail, passwordHash, name: name ?? null })
    .returning({ id: users.id });

  // Rattache automatiquement les invitations en attente pour cet email.
  try {
    await acceptPendingInvitationsForEmail(normalizedEmail, created.id, Date.now());
  } catch (err) {
    console.error("Acceptation des invitations au signup échouée :", err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
