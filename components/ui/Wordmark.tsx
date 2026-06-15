import { cn } from "@/lib/utils";

/**
 * Logotype typographique « Ask By La WineTech », sans-serif gras.
 * Les trois parties se distinguent : « Ask » navy, « By La » discret (gris,
 * plus petit), « WineTech » rose.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline justify-center gap-1.5 font-sans leading-none",
        className,
      )}
    >
      <span className="text-xl font-bold text-navy">Ask</span>
      <span className="text-sm font-medium text-faint">By&nbsp;La</span>
      <span className="text-xl font-bold text-rose">WineTech</span>
    </span>
  );
}
