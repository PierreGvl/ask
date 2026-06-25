"use client";

import { ImageUp } from "lucide-react";
import { useState, useTransition } from "react";
import { uploadProjectLogoAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Téléversement du logo d'un projet (stocké en base, servi par /api/assets).
 * Aperçu local avant envoi + validation client (l'action serveur reste l'autorité).
 */
export function LogoUploader({
  projectId,
  currentLogoUrl,
}: {
  projectId: string;
  currentLogoUrl: string | null;
}) {
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const shown = preview ?? currentLogoUrl;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setPreview(null);
      setHasFile(false);
      return;
    }
    if (!f.type.startsWith("image/")) {
      show("Le logo doit être une image.", "err");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      show("Logo trop lourd (max 2 Mo).", "err");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(f));
    setHasFile(true);
  }

  function submit(formData: FormData) {
    start(async () => {
      try {
        await uploadProjectLogoAction(formData);
        show("Logo mis à jour", "ok");
        setPreview(null);
        setHasFile(false);
      } catch {
        show("Échec du téléversement.", "err");
      }
    });
  }

  return (
    <form action={submit} className="flex items-center gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Logo"
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageUp className="h-6 w-6 text-faint" />
        )}
      </span>
      <div className="flex flex-col gap-2">
        <input
          type="file"
          name="file"
          accept="image/*"
          onChange={onPick}
          className="block w-full text-xs text-faint file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-navy-700"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending || !hasFile}
        >
          {pending ? "Envoi…" : "Téléverser le logo"}
        </Button>
      </div>
    </form>
  );
}
