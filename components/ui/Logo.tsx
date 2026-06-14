import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  size = 36,
  withWordmark = false,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo-ask.jpeg"
        alt="Ask By la Wine Tech"
        width={size}
        height={size}
        priority
        className="rounded-md object-contain"
      />
      {withWordmark && (
        <span className="font-serif text-lg font-semibold leading-none text-navy">
          Ask <span className="text-rose">By la Wine Tech</span>
        </span>
      )}
    </span>
  );
}
