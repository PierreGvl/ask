import type { CSSProperties } from "react";
import type { Project, WordmarkPart } from "@/lib/db/schema";
import { GREETING, SUGGESTIONS } from "@/lib/llm/prompts";

/**
 * Branding sérialisable d'un tenant, passé du serveur au client.
 * Toutes les valeurs ont un fallback sur l'identité « Ask by La Wine Tech »
 * historique, de sorte qu'un projet sans config reste pleinement fonctionnel.
 */
export type Branding = {
  name: string;
  description: string;
  logoUrl: string;
  greeting: string;
  suggestions: string[];
  /** Absent → le Wordmark rend sa version par défaut figée. */
  wordmark: { parts: WordmarkPart[] } | null;
};

const DEFAULT_DESCRIPTION =
  "Une IA Souveraine pour répondre à toutes les questions des vignerons.";

export const DEFAULT_BRANDING: Branding = {
  name: "Ask by La Wine Tech",
  description: DEFAULT_DESCRIPTION,
  logoUrl: "/logo.png",
  greeting: GREETING,
  suggestions: SUGGESTIONS,
  wordmark: null,
};

/** Construit le branding d'un projet (avec fallbacks sur le défaut). */
export function getBranding(project: Project | null): Branding {
  if (!project) return DEFAULT_BRANDING;
  const cfg = project.config ?? {};
  const theme = project.theme ?? {};
  return {
    name: project.name || DEFAULT_BRANDING.name,
    // Pas encore de description par projet : tagline par défaut pour l'instant.
    description: DEFAULT_DESCRIPTION,
    logoUrl: theme.logoUrl || DEFAULT_BRANDING.logoUrl,
    greeting: cfg.greeting || DEFAULT_BRANDING.greeting,
    suggestions:
      cfg.suggestions && cfg.suggestions.length
        ? cfg.suggestions
        : DEFAULT_BRANDING.suggestions,
    wordmark: theme.wordmark ?? null,
  };
}

/**
 * Variables CSS de couleur à poser en inline sur <html> pour surcharger les
 * tokens Tailwind (@theme) par tenant. Le style inline gagne sur les règles
 * :root de la feuille de styles, donc recolore toute l'UI d'un coup.
 */
export function brandingColorVars(project: Project | null): CSSProperties {
  const colors = project?.theme?.colors;
  if (!colors) return {};
  const map: Record<string, string> = {
    navy: "--color-navy",
    rose: "--color-rose",
    roseLight: "--color-rose-50",
  };
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    const cssVar = map[key] ?? `--color-${key}`;
    vars[cssVar] = value;
  }
  return vars as CSSProperties;
}
