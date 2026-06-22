"use client";

import {
  Database,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projets", icon: FolderKanban },
  { href: "/admin/corpus", label: "Corpus", icon: Database },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 text-base font-bold tracking-tight text-navy">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose text-sm font-bold text-white">
        A
      </span>
      Console
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-rose-50 text-rose"
                : "text-navy-700 hover:bg-surface-2",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-faint transition-colors hover:bg-surface-2 hover:text-rose"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      Se déconnecter
    </button>
  );
}

export function AdminNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden w-52 shrink-0 flex-col gap-4 border-r border-line bg-white p-3 md:flex">
        <Brand />
        <NavLinks />
        <SignOutButton />
      </aside>

      {/* Barre mobile */}
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <Brand />
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-navy-700 hover:bg-surface-2"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy/30"
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col gap-4 bg-white p-3 shadow-md">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-navy-700 hover:bg-surface-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <SignOutButton />
          </div>
        </div>
      )}
    </>
  );
}
