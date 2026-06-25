"use client";

import Image from "next/image";
import { useBranding } from "@/components/branding/BrandingProvider";
import { cn } from "@/lib/utils";

/**
 * En-tête de marque du tenant (haut de la sidebar).
 *
 * Mode `logo` → image (logoUrl). Sinon (mode `wordmark`, défaut) : texte stylisé
 * depuis theme.wordmark.parts, ou l'identité par défaut « Ask By La WineTech ».
 */
export function Wordmark({ className }: { className?: string }) {
  const { wordmark, brandMode, logoUrl, name } = useBranding();

  if (brandMode === "logo") {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={160}
        height={48}
        priority
        unoptimized
        className={cn("h-10 w-auto max-w-[200px] object-contain", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-baseline justify-center gap-1.5 font-sans leading-none",
        className,
      )}
    >
      {wordmark ? (
        wordmark.parts.map((part, i) => (
          <span
            key={`${part.text}-${i}`}
            className={
              part.dim ? "text-sm font-medium text-faint" : "text-xl font-bold"
            }
            style={part.color ? { color: part.color } : undefined}
          >
            {part.text}
          </span>
        ))
      ) : (
        <>
          <span className="text-xl font-bold text-navy">Ask</span>
          <span className="text-sm font-medium text-faint">By La</span>
          <span className="text-xl font-bold text-rose">WineTech</span>
        </>
      )}
    </span>
  );
}
