"use client";

import { SUGGESTIONS } from "@/lib/llm/prompts";

export function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="grid w-full max-w-3xl gap-2.5 sm:grid-cols-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-xl border border-line bg-white px-4 py-3 text-left text-sm text-ink transition-colors hover:border-rose/40 hover:bg-rose-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
