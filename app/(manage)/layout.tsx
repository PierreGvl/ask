import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/auth";
import { ToastProvider } from "@/components/ui/Toast";
import { isConsoleHost } from "@/lib/console";
import { requireProjectRole } from "@/lib/projects/access";
import { requireProject } from "@/lib/tenant/resolve";

/**
 * Espace d'administration client, servi sur le domaine du tenant
 * (ex. winetech.ask.fr/manage). Cloisonné : le projet est résolu par host et
 * l'utilisateur doit être owner/admin de CE projet (ou platform-admin).
 */
export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La gestion client n'existe pas sur l'hôte console (réservé à la plateforme).
  if (await isConsoleHost()) notFound();

  const project = await requireProject();
  try {
    await requireProjectRole(project.id, "admin");
  } catch (err) {
    if ((err as Error).message === "UNAUTHENTICATED") redirect("/login");
    notFound();
  }

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col bg-surface-2 text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="font-semibold tracking-tight text-navy">
              {project.name}
            </span>
            <nav className="flex items-center gap-3 text-sm text-faint">
              <Link href="/manage" className="hover:text-rose">
                Vue d&apos;ensemble
              </Link>
              <Link href="/manage/members" className="hover:text-rose">
                Membres
              </Link>
              <Link href="/manage/settings" className="hover:text-rose">
                Réglages
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-faint hover:text-rose">
              ← Retour au chat
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-faint hover:text-rose"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
      </div>
    </ToastProvider>
  );
}
