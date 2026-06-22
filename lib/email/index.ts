import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

/**
 * Envoi d'emails transactionnels via SMTP (provider-agnostique : Brevo,
 * Scaleway TEM, Mailjet…). Sans `SMTP_HOST`, on retombe sur un transport « log »
 * qui imprime le contenu en console — pratique en dev pour récupérer le lien
 * d'invitation sans configurer de fournisseur.
 */

let transporter: Transporter | null = null;
const smtpConfigured = Boolean(env.SMTP_HOST);

function getTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465 = TLS implicite ; 587 = STARTTLS
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!smtpConfigured) {
    console.info(
      `[email:log] (SMTP non configuré) → ${msg.to}\n  ${msg.subject}\n  ${msg.text}`,
    );
    return;
  }
  await getTransport().sendMail({ from: env.EMAIL_FROM, ...msg });
}

export function sendInvitationEmail(opts: {
  to: string;
  projectName: string;
  inviteUrl: string;
  role: string;
}): Promise<void> {
  const { to, projectName, inviteUrl, role } = opts;
  const roleLabel =
    role === "owner" ? "propriétaire" : role === "admin" ? "admin" : "membre";
  return sendEmail({
    to,
    subject: `Invitation à rejoindre ${projectName}`,
    text:
      `Vous êtes invité·e à rejoindre « ${projectName} » en tant que ${roleLabel}.\n\n` +
      `Acceptez l'invitation ici : ${inviteUrl}\n\n` +
      `Ce lien expire dans 7 jours.`,
    html:
      `<p>Vous êtes invité·e à rejoindre <strong>${projectName}</strong> en tant que ${roleLabel}.</p>` +
      `<p><a href="${inviteUrl}">Accepter l'invitation</a></p>` +
      `<p style="color:#64748b;font-size:13px">Ce lien expire dans 7 jours.</p>`,
  });
}
