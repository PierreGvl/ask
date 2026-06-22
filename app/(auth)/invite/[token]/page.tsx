import Link from "next/link";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AcceptInvite } from "@/components/projects/AcceptInvite";
import { getProjectById } from "@/lib/admin/queries";
import {
  getInvitationByTokenHash,
  hashToken,
  isInvitationExpired,
} from "@/lib/projects/queries";

export const metadata = { title: "Invitation — Ask" };

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-navy">
        Invitation
      </h1>
      <p className="text-sm text-faint">{children}</p>
      <Link
        href="/login"
        className="text-sm font-medium text-rose hover:underline"
      >
        Aller à la connexion
      </Link>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inv = await getInvitationByTokenHash(hashToken(token));

  if (!inv || inv.acceptedAt) {
    return <Notice>Cette invitation est invalide ou a déjà été utilisée.</Notice>;
  }
  if (isInvitationExpired(inv)) {
    return <Notice>Cette invitation a expiré. Demandez-en une nouvelle.</Notice>;
  }

  const project = await getProjectById(inv.projectId);
  const projectName = project?.name ?? "ce projet";
  const session = await auth();

  // Connecté : on vérifie la correspondance d'email.
  if (session?.user?.email) {
    const match =
      session.user.email.toLowerCase() === inv.email.toLowerCase();
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-center text-xl font-semibold tracking-tight text-navy">
          Rejoindre {projectName}
        </h1>
        {match ? (
          <>
            <p className="text-center text-sm text-faint">
              Vous êtes invité·e en tant que <strong>{inv.role}</strong>.
            </p>
            <AcceptInvite token={token} />
          </>
        ) : (
          <p className="text-center text-sm text-faint">
            Cette invitation vise <strong>{inv.email}</strong>, mais vous êtes
            connecté·e en tant que {session.user.email}. Déconnectez-vous puis
            rouvrez le lien.
          </p>
        )}
      </div>
    );
  }

  // Anonyme : inscription pré-remplie (l'invitation est acceptée au signup).
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-navy">
          Rejoindre {projectName}
        </h1>
        <p className="text-sm text-faint">
          Créez votre compte pour accepter l&apos;invitation ({inv.role}).
        </p>
      </div>
      <RegisterForm defaultEmail={inv.email} lockEmail />
    </div>
  );
}
