"use client";

import { useState } from "react";
import { createProjectAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

/** Bouton « Nouveau projet » + pop-up de création (server action createProjectAction). */
export function NewProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Nouveau projet
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy">Nouveau projet</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-faint hover:text-rose"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <form action={createProjectAction} className="grid gap-3 sm:grid-cols-2">
              <Field name="name" label="Nom" placeholder="Acme" required />
              <Field name="slug" label="Slug" placeholder="acme" required />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-faint">Tier</span>
                <Select name="tier" defaultValue="free">
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                  <option value="domaine">domaine</option>
                </Select>
              </label>
              <Field
                name="customDomain"
                label="Domaine personnalisé (optionnel)"
                placeholder="chat.exemple.fr"
              />
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">Créer le projet</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
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
