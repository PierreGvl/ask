"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

/** Bouton de déconnexion de la console (retour au login). */
export function ConsoleSignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-faint transition-colors hover:bg-surface-2 hover:text-rose"
    >
      <LogOut className="h-4 w-4" />
      Se déconnecter
    </button>
  );
}
