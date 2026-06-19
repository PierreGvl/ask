import Link from "next/link";
import { notFound } from "next/navigation";
import { isPlatformAdmin } from "@/lib/admin/guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Console réservée au staff plateforme. On masque son existence sinon.
  if (!(await isPlatformAdmin())) notFound();

  return (
    <div className="flex min-h-screen bg-surface-2 text-ink">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line bg-white p-4 sm:flex">
        <Link href="/admin" className="mb-4 font-serif text-lg font-semibold">
          Ask · Console
        </Link>
        <NavLink href="/admin">Tableau de bord</NavLink>
        <NavLink href="/admin/projects">Projets</NavLink>
        <NavLink href="/admin/users">Utilisateurs</NavLink>
        <Link
          href="/"
          className="mt-auto rounded-lg px-3 py-2 text-sm text-faint hover:bg-surface-2"
        >
          ← Retour à l&apos;app
        </Link>
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
