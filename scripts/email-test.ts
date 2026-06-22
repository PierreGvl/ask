/**
 * Test d'envoi SMTP (validation des identifiants avant de câbler Coolify).
 *
 * Usage :
 *   SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... EMAIL_FROM='Ask <no-reply@obsidio.fr>' \
 *     npm run email:test -- --to toi@exemple.fr
 *
 * Vérifie la connexion/auth (transporter.verify) puis envoie un email témoin.
 * N'importe pas lib/email (server-only) : transport nodemailer autonome.
 */
import { config } from "dotenv";
import nodemailer from "nodemailer";

config({ path: ".env" });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const to = arg("to");
  if (!to) {
    console.error("❌ --to requis (ex. --to toi@exemple.fr).");
    process.exit(1);
  }
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.error("❌ SMTP_HOST manquant dans l'environnement.");
    process.exit(1);
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const from = process.env.EMAIL_FROM ?? "Ask <no-reply@obsidio.fr>";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  console.log(`→ Vérification SMTP ${host}:${port}…`);
  await transporter.verify();
  console.log("✓ Connexion/auth OK. Envoi du témoin…");

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Test SMTP — Ask",
    text: "Si vous lisez ceci, l'envoi SMTP de Ask fonctionne ✅",
  });
  console.log(`✓ Email envoyé (messageId=${info.messageId}). Vérifiez la boîte de ${to}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Échec SMTP :", err instanceof Error ? err.message : err);
  process.exit(1);
});
