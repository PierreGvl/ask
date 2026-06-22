"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { acceptInviteAction } from "@/lib/projects/member-actions";

/** Bouton d'acceptation pour un utilisateur déjà connecté (email correspondant). */
export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await acceptInviteAction(token);
            if (res.ok) {
              router.push("/");
              router.refresh();
            } else {
              setError(res.error ?? "Action impossible.");
            }
          })
        }
      >
        {pending ? "Validation…" : "Rejoindre le projet"}
      </Button>
    </div>
  );
}
