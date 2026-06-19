import "server-only";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Thème propre à la console : surcharge les tokens de marque du tenant
 * (navy/rose + serif Wine Tech) par une palette neutre/pro (slate + indigo).
 * Appliqué en `style` sur le conteneur racine de la console et du login console.
 */
export const CONSOLE_THEME = {
  "--color-navy": "#0f172a",
  "--color-navy-700": "#334155",
  "--color-ink": "#0f172a",
  "--color-rose": "#4f46e5",
  "--color-rose-600": "#4338ca",
  "--color-rose-700": "#3730a3",
  "--color-rose-50": "#eef2ff",
  "--color-rose-100": "#e0e7ff",
  "--color-surface-2": "#f8fafc",
  "--font-serif": "var(--font-sans)",
} as CSSProperties;

/** Vrai si la requête arrive sur l'hôte dédié à la console (CONSOLE_HOST). */
export async function isConsoleHost(): Promise<boolean> {
  if (!env.CONSOLE_HOST) return false;
  const h = await headers();
  const host = (h.get("host") ?? "").split(":")[0].toLowerCase();
  return host === env.CONSOLE_HOST.split(":")[0].toLowerCase();
}
