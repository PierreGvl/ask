import type { CSSProperties } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/guard";
import { env } from "@/lib/env";

/**
 * Thème propre à la console : on surcharge les tokens de marque (navy/rose du
 * tenant) par une palette neutre/pro (slate + accent indigo) sur le conteneur
 * de la console. Les utilitaires Tailwind (text-navy, bg-rose-50…) lisant ces
 * variables, toute l'UI se recolore sans toucher chaque composant.
 */
const CONSOLE_THEME = {
  "--color-navy": "#0f172a",
  "--color-navy-700": "#334155",
  "--color-ink": "#0f172a",
  "--color-rose": "#4f46e5",
  "--color-rose-600": "#4338ca",
  "--color-rose-700": "#3730a3",
  "--color-rose-50": "#eef2ff",
  "--color-rose-100": "#e0e7ff",
  "--color-surface-2": "#f8fafc",
  // Les titres de la console passent en sans (pas de serif Wine Tech).
  "--font-serif": "var(--font-sans)",
} as CSSProperties;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1) Garde par hôte : si CONSOLE_HOST est défini, la console n'existe QUE là.
  //    Sur tout autre domaine (tenants), on masque son existence (404).
  if (env.CONSOLE_HOST) {
    const h = await headers();
    const host = (h.get("host") ?? "").split(":")[0].toLowerCase();
    if (host !== env.CONSOLE_HOST.split(":")[0].toLowerCase()) notFound();
  }

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
