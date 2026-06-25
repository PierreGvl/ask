"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { WordmarkPart } from "@/lib/db/schema";

/**
 * Éditeur du texte stylisé d'en-tête (wordmark) : liste de segments
 * { texte, couleur, atténué }. Sérialisé en JSON dans un input caché `wordmark`
 * lu par updateProjectAction.
 */
export function WordmarkEditor({
  defaultParts,
}: {
  defaultParts: WordmarkPart[];
}) {
  const [parts, setParts] = useState<WordmarkPart[]>(
    defaultParts.length ? defaultParts : [{ text: "" }],
  );

  function update(i: number, patch: Partial<WordmarkPart>) {
    setParts((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function remove(i: number) {
    setParts((p) => p.filter((_, j) => j !== i));
  }
  function add() {
    setParts((p) => [...p, { text: "" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="wordmark" value={JSON.stringify(parts)} />
      {/* Aperçu */}
      <div className="flex items-baseline gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2">
        {parts.some((p) => p.text.trim()) ? (
          parts.map((p, i) => (
            <span
              key={i}
              className={p.dim ? "text-sm font-medium text-faint" : "text-xl font-bold"}
              style={p.color ? { color: p.color } : undefined}
            >
              {p.text}
            </span>
          ))
        ) : (
          <span className="text-xs text-faint">Aperçu du texte stylisé…</span>
        )}
      </div>

      {parts.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={p.text}
            placeholder="Segment (ex. Ask)"
            onChange={(e) => update(i, { text: e.target.value })}
            className="flex-1"
          />
          <input
            type="color"
            value={p.color ?? "#141934"}
            onChange={(e) => update(i, { color: e.target.value })}
            className="h-9 w-10 shrink-0 cursor-pointer rounded border border-line bg-white"
            title="Couleur du segment"
          />
          <label className="flex shrink-0 items-center gap-1 text-xs text-faint">
            <input
              type="checkbox"
              checked={!!p.dim}
              onChange={(e) => update(i, { dim: e.target.checked })}
              className="h-4 w-4 rounded border-line"
            />
            atténué
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            className="rounded p-1.5 text-faint hover:text-rose"
            aria-label="Retirer le segment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        Ajouter un segment
      </Button>
    </div>
  );
}
