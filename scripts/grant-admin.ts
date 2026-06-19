/**
 * Promeut (ou rétrograde) un utilisateur au rang d'admin plateforme.
 *
 * Usage :
 *   npm run admin:grant -- --email contact@obsidio.fr
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
  if (!email) {
    console.error("❌ --email requis.");
    process.exit(1);
  }

  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  const res = await db
    .update(users)
    .set({ isPlatformAdmin: !revoke })
    .where(eq(users.email, email))
    .returning({ id: users.id });

  if (res.length === 0) {
    console.error(`❌ Aucun utilisateur avec l'email « ${email} ».`);
    process.exit(1);
  }
  console.log(
    `✓ ${email} ${revoke ? "n'est plus" : "est désormais"} admin plateforme.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Échec :", err);
  process.exit(1);
});
