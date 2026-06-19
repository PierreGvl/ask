import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { type User, users } from "@/lib/db/schema";

/**
 * Garde de la console plateforme : exige une session dont l'utilisateur a
 * `isPlatformAdmin`. Le flag n'est pas dans le JWT → on le lit en base
 * (vérité à jour, révocable immédiatement). Lève si non autorisé.
 */
export async function requirePlatformAdmin(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user || !user.isPlatformAdmin) throw new Error("FORBIDDEN");
  return user;
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
