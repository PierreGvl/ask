import type { LicenseTier, Project, ProjectFeatures } from "@/lib/db/schema";

/**
 * Fonctionnalités par niveau de licence.
 *
 *  - free    : sources publiques uniquement (pas de RAG privé), web search.
 *  - pro     : RAG privé (données du client) + widget embarquable.
 *  - domaine : pro + génération de documents PDF (déclarations, formalités).
 *
 * webSearch est activé partout : la version gratuite s'appuie sur les sources
 * publiques + le web ; les tiers payants y ajoutent leur corpus privé.
 */
export const TIER_FEATURES: Record<LicenseTier, ProjectFeatures> = {
  free: { customRag: false, webSearch: true, pdfGeneration: false, widget: false },
  pro: { customRag: true, webSearch: true, pdfGeneration: false, widget: true },
  domaine: { customRag: true, webSearch: true, pdfGeneration: true, widget: true },
};

/**
 * Fonctionnalités effectives d'un projet : défauts du tier, surchargés par les
 * overrides explicites stockés sur `projects.features` (cas particuliers).
 */
export function resolveFeatures(project: Project): ProjectFeatures {
  return { ...TIER_FEATURES[project.tier], ...(project.features ?? {}) };
}
