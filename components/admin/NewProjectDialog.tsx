"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createProjectAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

/** Bouton « Nouveau projet » + pop-up de création (server action). */
export function NewProjectDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nouveau projet
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-navy">
                  Nouveau projet
                </h2>
                <p className="text-xs text-faint">
                  Un tenant : son chat, son corpus privé, ses utilisateurs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-rose"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={createProjectAction} className="flex flex-col gap-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="name" label="Nom" placeholder="Ask by La Wine Tech" required />
                <Field name="slug" label="Slug (sous-domaine)" placeholder="winetech" required />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-faint">Type</span>
                  <Select name="type" defaultValue="b2c">
                    <option value="b2c">B2C (public)</option>
                    <option value="white_label">White Label (public)</option>
                    <option value="b2b">B2B (privé)</option>
                  </Select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-faint">Livraison</span>
                  <Select name="deliveryMode" defaultValue="hosted">
                    <option value="hosted">Site hébergé</option>
                    <option value="widget">Widget (clé API)</option>
                  </Select>
                </label>
                <div className="sm:col-span-2">
                  <Field
                    name="customDomain"
                    label="Domaine personnalisé (optionnel)"
                    placeholder="ask.obsidio.fr"
                  />
                </div>
              </div>
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-faint">
                Le type pilote l&apos;accès : <strong>B2C / White Label</strong> →
                chat public ; <strong>B2B</strong> → privé (invitation). Un palier
                « Gratuit » par défaut est créé automatiquement.
              </p>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">Créer le projet</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-faint">{label}</span>
      <Input name={name} placeholder={placeholder} required={required} />
    </label>
  );
}
