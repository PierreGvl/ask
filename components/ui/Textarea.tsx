import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
