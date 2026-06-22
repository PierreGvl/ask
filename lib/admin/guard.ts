import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { type PlatformAdmin, platformAdmins } from "@/lib/db/schema";

/**
 * Garde de la console plateforme : exige une session de type "console" dont
 * l'identité existe dans platform_admins (lecture en base à chaque requête →
 * révocation immédiate). Lève UNAUTHENTICATED / FORBIDDEN.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.kind !== "console") throw new Error("FORBIDDEN");
  const admin = await db.query.platformAdmins.findFirst({
    where: eq(platformAdmins.id, session.user.id),
  });
  if (!admin) throw new Error("FORBIDDEN");
  return admin;
}

/** Variante booléenne (pour le garde de layout, sans exception). */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    await requirePlatformAdmin();
    return true;
  } catch {
    return false;
  }
}
