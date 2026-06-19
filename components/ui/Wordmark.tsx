"use client";

import { useBranding } from "@/components/branding/BrandingProvider";
import { cn } from "@/lib/utils";

/**
 * Logotype typographique du tenant.
 *
 * Si le projet définit un wordmark (theme.wordmark.parts), on le rend
 * dynamiquement ; sinon on rend l'identité par défaut « Ask By La WineTech »
 * (« Ask » navy, « By La » discret, « WineTech » rose).
 */
export function Wordmark({ className }: { className?: string }) {
  const { wordmark } = useBranding();

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
