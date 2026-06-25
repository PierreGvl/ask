"use client";

import Image from "next/image";
import { useBranding } from "@/components/branding/BrandingProvider";
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
  const { logoUrl, name } = useBranding();
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        priority
        unoptimized
        className="rounded-md object-contain"
      />
      {withWordmark && (
        <span className="font-serif text-lg font-semibold leading-none text-navy">
          {name}
        </span>
      )}
    </span>
  );
}
