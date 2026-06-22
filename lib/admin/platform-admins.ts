import "server-only";
import { count, desc, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { platformAdmins } from "@/lib/db/schema";

export function listPlatformAdmins() {
  return db
    .select({
      id: platformAdmins.id,
      email: platformAdmins.email,
      name: platformAdmins.name,
      createdAt: platformAdmins.createdAt,
    })
    .from(platformAdmins)
    .orderBy(desc(platformAdmins.createdAt));
}

export async function countPlatformAdmins(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(platformAdmins);
  return row?.n ?? 0;
}

export async function createPlatformAdmin(input: {
  email: string;
  name?: string | null;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);
  await db
    .insert(platformAdmins)
    .values({
      email: input.email.toLowerCase(),
      name: input.name || null,
      passwordHash,
    })
    .onConflictDoUpdate({
      target: platformAdmins.email,
      set: { passwordHash, name: input.name || null },
    });
}

export async function setPlatformAdminPassword(id: string, password: string) {
  const passwordHash = await hashPassword(password);
  await db
    .update(platformAdmins)
    .set({ passwordHash })
    .where(eq(platformAdmins.id, id));
}

export async function deletePlatformAdmin(id: string) {
  await db.delete(platformAdmins).where(eq(platformAdmins.id, id));
}
