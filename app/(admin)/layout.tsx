import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
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
    <div
      className="flex min-h-screen flex-col bg-surface-2 text-ink md:flex-row"
      style={CONSOLE_THEME}
    >
      <AdminNav />
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
