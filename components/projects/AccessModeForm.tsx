"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { setAccessModeAction } from "@/lib/projects/member-actions";

/** Bascule public/privé du chat tenant (owner uniquement). */
export function AccessModeForm({
  projectId,
  current,
}: {
  projectId: string;
  current: "public" | "private";
}) {
  const [mode, setMode] = useState(current);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        startTransition(async () => {
          const res = await setAccessModeAction(projectId, mode);
          setSaved(res.ok);
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-faint">Accès au chat</span>
        <Select
          value={mode}
          onChange={(e) => setMode(e.target.value as "public" | "private")}
          className="w-56"
        >
          <option value="public">public (ouvert à tous)</option>
          <option value="private">privé (membres invités)</option>
        </Select>
      </label>
      <Button type="submit" variant="outline" disabled={pending}>
        Enregistrer
      </Button>
      {saved && <span className="text-sm text-emerald-700">Enregistré.</span>}
    </form>
  );
}
