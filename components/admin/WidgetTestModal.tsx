"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { mintWidgetTestKeyAction } from "@/app/(admin)/admin/actions";

/**
 * Bouton « Tester » → génère une clé API de test éphémère et ouvre le chatbot du
 * projet dans une modale (iframe /embed). Marche pour tout projet widget, même
 * sans domaine (l'embed résout le projet par la clé).
 */
export function WidgetTestModal({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function openTest() {
    setLoading(true);
    setError(null);
    try {
      const res = await mintWidgetTestKeyAction(projectId);
      setKey(res.key);
      setOpen(true);
    } catch {
      setError("Échec");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openTest}
        disabled={loading}
        className="text-xs font-medium text-rose hover:underline disabled:opacity-50"
      >
        {loading ? "…" : error ?? "Tester"}
      </button>

      {open && key && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-semibold text-navy">
                Test widget — {projectName}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-rose"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              title={`Widget ${projectName}`}
              src={`/embed?key=${encodeURIComponent(key)}`}
              className="h-[600px] w-[400px] max-w-[90vw] border-0"
            />
          </div>
        </div>
      )}
    </>
  );
}
