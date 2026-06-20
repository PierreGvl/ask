import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Carte/panneau de base : bordure fine, coins arrondis, élévation douce. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/** En-tête de carte : titre à gauche, actions à droite. */
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-sm font-semibold text-navy", className)}
      {...props}
    />
  );
}

/** Corps de carte (padding standard). */
export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
