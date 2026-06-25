"use client";

import { ImageUp } from "lucide-react";
import { type ReactNode, useRef, useState, useTransition } from "react";
import { updateProjectAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { Project } from "@/lib/db/schema";

const MAX_BYTES = 2 * 1024 * 1024;
const FAVICON_SIZE = 128;

/** Recadre une image en carré PNG (contain, centré). SVG laissé tel quel. */
async function squarePng(file: File, size: number): Promise<File> {
  if (file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/png"),
  );
  bitmap.close();
  return blob ? new File([blob], "favicon.png", { type: "image/png" }) : file;
}

function badImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Le fichier doit être une image.";
  if (file.size > MAX_BYTES) return "Image trop lourde (max 2 Mo).";
  return null;
}

/**
 * Formulaire « Identité & configuration » d'un projet : tous les champs +
 * logo/favicon, enregistrés par un SEUL bouton (le favicon est normalisé en
 * carré PNG côté client avant l'envoi).
 */
export function IdentityForm({ project }: { project: Project }) {
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const colors = project.theme?.colors ?? {};
  const cfg = project.config ?? {};
  const shownLogo = logoPreview ?? project.theme?.logoUrl ?? null;
  const shownFavicon = faviconPreview ?? project.theme?.faviconUrl ?? null;

  function onPick(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (v: string | null) => void,
  ) {
    const f = e.target.files?.[0];
    if (!f) return setPreview(null);
    const err = badImage(f);
    if (err) {
      show(err, "err");
      e.target.value = "";
      return setPreview(null);
    }
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget); // sync : avant tout await
    try {
      const fav = fd.get("favicon");
      if (fav instanceof File && fav.size > 0) {
        fd.set("favicon", await squarePng(fav, FAVICON_SIZE));
      }
    } catch {
      show("Favicon illisible.", "err");
      return;
    }
    start(async () => {
      const res = await updateProjectAction(fd);
      if (res.ok) {
        show("Projet enregistré", "ok");
        setLogoPreview(null);
        setFaviconPreview(null);
        if (logoRef.current) logoRef.current.value = "";
        if (faviconRef.current) faviconRef.current.value = "";
      } else {
        show(res.error, "err");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={project.id} />
      <Field name="name" label="Nom" defaultValue={project.name} />
      <Field name="slug" label="Slug" defaultValue={project.slug} />
      <Field
        name="customDomain"
        label="Domaine personnalisé"
        defaultValue={project.customDomain ?? ""}
      />
      <Labeled label="Statut">
        <Select name="status" defaultValue={project.status}>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </Select>
      </Labeled>
      <Labeled label="Type (pilote l'accès : B2B = privé)">
        <Select name="type" defaultValue={project.type}>
          <option value="b2c">B2C (public)</option>
          <option value="white_label">White Label (public)</option>
          <option value="b2b">B2B (privé)</option>
        </Select>
      </Labeled>
      <Labeled label="Mode de livraison">
        <Select name="deliveryMode" defaultValue={project.deliveryMode}>
          <option value="hosted">Site hébergé</option>
          <option value="widget">Widget (clé API)</option>
        </Select>
      </Labeled>
      <Labeled label="Modèle de facturation">
        <Select name="billingModel" defaultValue={project.billingModel}>
          <option value="end_user">Paliers utilisateur</option>
          <option value="company">Abonnement entreprise</option>
        </Select>
      </Labeled>
      <Field
        name="color_navy"
        label="Couleur principale"
        defaultValue={colors.navy ?? ""}
        placeholder="#1f2937"
      />
      <Field
        name="color_rose"
        label="Couleur d'accent"
        defaultValue={colors.rose ?? ""}
        placeholder="#2563eb"
      />
      <Field
        name="color_roseLight"
        label="Fond clair"
        defaultValue={colors.roseLight ?? ""}
        placeholder="#eff6ff"
      />
      <Field
        name="defaultDomain"
        label="Sous-corpus par défaut"
        defaultValue={cfg.defaultDomain ?? ""}
        placeholder="reglementaire"
      />

      {/* Identité visuelle : logo + favicon + option d'accueil, regroupés */}
      <div className="flex flex-col gap-4 border-t border-line pt-4 sm:col-span-2">
        <span className="text-sm font-medium text-navy-700">
          Identité visuelle
        </span>
        <div className="grid gap-5 sm:grid-cols-2">
          <AssetField
            label="Logo"
            name="logo"
            inputRef={logoRef}
            shown={shownLogo}
            onChange={(e) => onPick(e, setLogoPreview)}
          />
          <AssetField
            label="Favicon (onglet navigateur)"
            name="favicon"
            inputRef={faviconRef}
            shown={shownFavicon}
            onChange={(e) => onPick(e, setFaviconPreview)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="heroLogoOnly"
            defaultChecked={project.theme?.heroLogoOnly ?? false}
            className="h-4 w-4 rounded border-line"
          />
          <span className="text-faint">
            Accueil : logo seul (masquer «&nbsp;Bonjour&nbsp;!&nbsp;» et agrandir
            le logo)
          </span>
        </label>
      </div>

      <Area
        name="greeting"
        label="Message d'accueil"
        defaultValue={cfg.greeting ?? ""}
      />
      <Area
        name="systemPrompt"
        label="Prompt système (persona métier)"
        defaultValue={cfg.systemPrompt ?? ""}
        rows={5}
        full
      />
      <Area
        name="searchToolDescription"
        label="Description de l'outil de recherche"
        defaultValue={cfg.searchToolDescription ?? ""}
        full
      />
      <Area
        name="suggestions"
        label="Suggestions (une par ligne)"
        defaultValue={(cfg.suggestions ?? []).join("\n")}
        rows={4}
        full
      />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function AssetField({
  label,
  name,
  shown,
  inputRef,
  onChange,
}: {
  label: string;
  name: string;
  shown: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImageUp className="h-6 w-6 text-faint" />
        )}
      </span>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-faint">{label}</span>
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/*"
          onChange={onChange}
          className="block w-full text-xs text-faint file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-navy-700"
        />
      </label>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-faint">{label}</span>
      {children}
    </label>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <Labeled label={label}>
      <Input name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </Labeled>
  );
}

function Area({
  name,
  label,
  defaultValue,
  rows = 2,
  full,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  full?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1 text-sm ${full ? "sm:col-span-2" : ""}`}
    >
      <span className="text-faint">{label}</span>
      <Textarea name={name} defaultValue={defaultValue} rows={rows} />
    </label>
  );
}
