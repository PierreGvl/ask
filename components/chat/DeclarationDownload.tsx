"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import type { DeclarationData } from "@/lib/pdf/types";

/**
 * Bouton de téléchargement d'une déclaration générée (tier Domaine). POSTe les
 * champs structurés à /api/documents/generate (gardé par licence + session) et
 * déclenche le téléchargement du PDF renvoyé.
 */
export function DeclarationDownload({
  declaration,
}: {
  declaration: DeclarationData;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(declaration),
      });
      if (!res.ok) {
        setError(
          res.status === 403
            ? "Génération de documents non incluse dans votre licence."
            : "Échec de la génération du document.",
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${declaration.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-1">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="inline-flex w-fit items-center gap-2 rounded-pill bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Télécharger « {declaration.title} » (PDF)
      </button>
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
