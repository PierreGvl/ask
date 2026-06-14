"use client";

import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ConversationSummary = {
  id: string;
  title: string;
};

export function ConversationItem({ conv }: { conv: ConversationSummary }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname === `/c/${conv.id}`;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conv.title);

  async function save() {
    const next = title.trim();
    setEditing(false);
    if (!next || next === conv.title) {
      setTitle(conv.title);
      return;
    }
    await fetch(`/api/conversations/${conv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    router.refresh();
  }

  async function remove() {
    setMenuOpen(false);
    await fetch(`/api/conversations/${conv.id}`, { method: "DELETE" });
    if (active) router.push("/");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setTitle(conv.title);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
        />
        <button onClick={save} aria-label="Valider" className="text-rose">
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setTitle(conv.title);
            setEditing(false);
          }}
          aria-label="Annuler"
          className="text-faint"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-lg pr-1 transition-colors",
        active ? "bg-rose-50" : "hover:bg-rose-50/60",
      )}
    >
      <Link
        href={`/c/${conv.id}`}
        className={cn(
          "min-w-0 flex-1 truncate px-2.5 py-2 text-sm",
          active ? "text-navy" : "text-muted",
        )}
      >
        {conv.title}
      </Link>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Options"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-hidden
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-1 top-9 z-20 w-36 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-md">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditing(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-rose-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Renommer
            </button>
            <button
              type="button"
              onClick={remove}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
