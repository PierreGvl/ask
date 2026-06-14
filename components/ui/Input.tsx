import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-faint focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
