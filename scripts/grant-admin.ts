/**
 * Gère les admins console (table platform_admins, identité globale séparée des
 * tenants). C'est le chemin de bootstrap : la console n'a pas d'inscription publique.
 *
 * Usage :
 *   npm run admin:grant -- --email contact@obsidio.fr --password 'motdepasse-fort' [--name "Pierre"]
 *   npm run admin:grant -- --email x@y.fr --revoke
 */
import { config } from "dotenv";

config({ path: ".env" });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.toLowerCase();
  const revoke = process.argv.includes("--revoke");
  const password = arg("password");
  const name = arg("name") ?? null;
  if (!email) {
    console.error("❌ --email requis.");
    process.exit(1);
  }

  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { platformAdmins } = await import("@/lib/db/schema");

  if (revoke) {
    const res = await db
      .delete(platformAdmins)
      .where(eq(platformAdmins.email, email))
      .returning({ id: platformAdmins.id });
    if (res.length === 0) {
      console.error(`❌ Aucun admin console avec l'email « ${email} ».`);
      process.exit(1);
    }
    console.log(`✓ ${email} n'est plus admin console.`);
    process.exit(0);
  }

  if (!password || password.length < 12) {
    console.error("❌ --password requis (≥ 12 caractères) pour créer/mettre à jour.");
    process.exit(1);
  }
  const { hashPassword } = await import("@/lib/auth/password");
  const passwordHash = await hashPassword(password);
  await db
    .insert(platformAdmins)
    .values({ email, name, passwordHash })
    .onConflictDoUpdate({
      target: platformAdmins.email,
      set: { passwordHash, name },
    });
  console.log(`✓ ${email} est désormais admin console.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Échec :", err);
  process.exit(1);
});
