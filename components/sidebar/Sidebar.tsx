"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NEW_CHAT_EVENT } from "@/components/chat/ChatView";
import { Wordmark } from "@/components/ui/Wordmark";
import { AccountFooter } from "./AccountFooter";
import {
  ConversationItem,
  type ConversationSummary,
} from "./ConversationItem";

export function Sidebar({
  user,
  conversations,
  onNavigate,
}: {
  user: { name?: string | null; email?: string | null } | null;
  conversations: ConversationSummary[];
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function newChat() {
    onNavigate?.();
    // Déjà sur l'accueil : on réinitialise le chat en place (évite un no-op
    // de navigation). Sinon on navigue vers l'accueil (remontage propre).
    if (pathname === "/") {
      window.dispatchEvent(new Event(NEW_CHAT_EVENT));
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex h-dvh w-[280px] flex-col border-r border-line bg-surface-2">
      <div className="px-3 pt-8 pb-8">
        <Link href="/" onClick={onNavigate} className="flex justify-center px-1.5">
          <Wordmark />
        </Link>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={newChat}
          className="flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium text-navy transition-colors hover:border-rose/40 hover:bg-rose-50"
        >
          <Plus className="h-4 w-4 text-rose" />
          Nouveau chat
        </button>
      </div>

      <nav className="scrollbar-thin mt-4 flex-1 overflow-y-auto px-3">
        {user ? (
          conversations.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {conversations.map((c) => (
                <li key={c.id} onClick={onNavigate}>
                  <ConversationItem conv={c} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-4 text-sm text-faint">
              Aucune conversation pour l&apos;instant.
            </p>
          )
        ) : (
          <p className="px-2 py-4 text-sm leading-relaxed text-faint">
            Connectez-vous pour retrouver l&apos;historique de vos
            conversations.
          </p>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <AccountFooter user={user} />
      </div>
    </div>
  );
}
