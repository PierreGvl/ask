"use client";

import { LogIn, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function AccountFooter({
  user,
}: {
  user: { name?: string | null; email?: string | null } | null;
}) {
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 rounded-full bg-rose px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-600"
      >
        <LogIn className="h-4 w-4" />
        Se connecter
      </Link>
    );
  }

  const label = user.name || user.email || "Mon compte";
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose text-xs font-semibold text-white">
        {getInitials(user.name, user.email)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy">{label}</p>
        {user.email && user.name && (
          <p className="truncate text-xs text-faint">{user.email}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        aria-label="Se déconnecter"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-rose-50 hover:text-rose"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
