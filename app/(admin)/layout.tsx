import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConsoleSignOut } from "@/components/admin/ConsoleSignOut";
import { requirePlatformAdmin } from "@/lib/admin/guard";
import { CONSOLE_THEME, isConsoleHost } from "@/lib/console";
import { env } from "@/lib/env";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1) Garde par hôte : si CONSOLE_HOST est défini, la console n'existe QUE là.
  //    Sur tout autre domaine (tenants), on masque son existence (404).
  if (env.CONSOLE_HOST && !(await isConsoleHost())) notFound();

  // 2) Garde par rôle : non connecté → login ; connecté non-admin → 404.
  try {
    await requirePlatformAdmin();
  } catch (err) {
    if ((err as Error).message === "UNAUTHENTICATED") redirect("/login");
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-surface-2 text-ink" style={CONSOLE_THEME}>
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line bg-white p-4 sm:flex">
        <Link
          href="/admin"
          className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose text-sm font-bold text-white">
            A
          </span>
          Console
        </Link>
        <NavLink href="/admin">Tableau de bord</NavLink>
        <NavLink href="/admin/projects">Projets</NavLink>
        <NavLink href="/admin/users">Utilisateurs</NavLink>
        <ConsoleSignOut />
      </aside>
      <main className="flex-1 p-6 sm:p-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-surface-2"
    >
      {children}
    </Link>
  );
}
