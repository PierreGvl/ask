import { signOut } from "@/auth";
import { Wordmark } from "@/components/ui/Wordmark";

/**
 * Écran affiché à un utilisateur CONNECTÉ mais NON membre d'un projet privé.
 * On ne redirige PAS vers /login (qui renverrait vers / → boucle infinie) : on
 * affiche un message clair avec une sortie (déconnexion / changement de compte).
 */
export function PrivateAccessNotice({ projectName }: { projectName: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-rose-50 px-4 text-center">
      <span className="scale-110">
        <Wordmark />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-navy">
          Accès réservé
        </h1>
        <p className="text-sm text-faint">
          Votre compte n&apos;a pas accès à {projectName}. Demandez une
          invitation à un administrateur du projet, ou connectez-vous avec un
          autre compte.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="text-sm font-medium text-rose hover:underline"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
