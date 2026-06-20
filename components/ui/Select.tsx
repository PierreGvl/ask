import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
