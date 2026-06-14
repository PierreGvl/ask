"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "./ConversationItem";
import { Sidebar } from "./Sidebar";

export function ChatShell({
  user,
  conversations,
  children,
}: {
  user: { name?: string | null; email?: string | null } | null;
  conversations: ConversationSummary[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh">
      {/* Sidebar desktop */}
      <aside className="hidden md:block">
        <Sidebar user={user} conversations={conversations} />
      </aside>

      {/* Sidebar mobile (drawer) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50">
            <Sidebar
              user={user}
              conversations={conversations}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile */}
        <div className="flex items-center justify-between border-b border-line px-3 py-2 md:hidden">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy hover:bg-rose-50"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Logo size={28} withWordmark />
          <span className="w-9" />
        </div>

        <main className={cn("min-h-0 flex-1")}>{children}</main>
      </div>
    </div>
  );
}
