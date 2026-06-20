import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger";

// accent/danger utilisent les tokens rose → suivent CONSOLE_THEME (indigo).
// success/warning sont sémantiques (vert/ambre fixes).
const variants: Record<Variant, string> = {
  neutral: "bg-surface-2 text-faint",
  accent: "bg-rose-50 text-rose",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
