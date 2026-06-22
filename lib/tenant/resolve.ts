import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { type Project, projects } from "@/lib/db/schema";

/**
 * Résolution du tenant (projet) à partir du host de la requête.
 *
 * Deux vecteurs pour l'app standalone :
 *  - sous-domaine `slug.<APP_BASE_DOMAIN>` → lookup par `slug`
 *  - domaine personnalisé (ex. ask.hervai.fr) → lookup par `customDomain`
 *
 * (Le canal widget résout le projet par clé API, pas par host — cf. la route
 * dédiée du widget.)
 *
 * La résolution se fait côté Node (accès DB), jamais dans `proxy.ts` (Edge).
 * `cache()` garantit un seul lookup par requête.
 */

/** Extrait le sous-domaine si le host appartient au domaine racine, sinon null. */
function subdomainOf(host: string): string | null {
  const base = env.APP_BASE_DOMAIN.toLowerCase();
  const h = host.toLowerCase().split(":")[0]; // retire le port
  if (h === base || h === `www.${base}`) return null;
  if (h.endsWith(`.${base}`)) {
    const label = h.slice(0, -(base.length + 1));
    // Ne garde que le premier label (winetech.ask.fr → winetech).
    return label.split(".")[0] || null;
  }
  return null;
}

function defaultProject() {
  return db.query.projects.findFirst({
    where: eq(projects.slug, env.DEFAULT_PROJECT_SLUG),
  });
}

async function loadProjectByHost(host: string | null): Promise<Project | null> {
  if (!host) return (await defaultProject()) ?? null;

  const sub = subdomainOf(host);
  const hostname = host.toLowerCase().split(":")[0];

  // Sous-domaine du domaine racine → résolution stricte par slug (un
  // sous-domaine inconnu reste introuvable, pas de fallback silencieux).
  if (sub) {
    return (
      (await db.query.projects.findFirst({
        where: eq(projects.slug, sub),
      })) ?? null
    );
  }

  // Sinon (apex, www, ou domaine personnalisé) : on privilégie une
  // correspondance EXACTE du domaine personnalisé, puis fallback projet par
  // défaut. (Évite l'ambiguïté de l'ancien OR customDomain/slug-par-défaut qui
  // pouvait renvoyer le projet par défaut au lieu du bon tenant.)
  const byDomain = await db.query.projects.findFirst({
    where: eq(projects.customDomain, hostname),
  });
  return byDomain ?? (await defaultProject()) ?? null;
}

/** Projet courant résolu depuis le host, ou null si aucun ne correspond. */
export const resolveProject = cache(async (): Promise<Project | null> => {
  const h = await headers();
  try {
    return await loadProjectByHost(h.get("host"));
  } catch (err) {
    // Base injoignable : on ne casse pas tout le rendu, on retombe sur le
    // branding par défaut (null). Utile en prod (blip DB) et en dev sans base.
    console.error("resolveProject: base injoignable, fallback défaut.", err);
    return null;
  }
});

/** Variante stricte : lève une erreur si le tenant est introuvable/suspendu. */
export async function requireProject(): Promise<Project> {
  const project = await resolveProject();
  if (!project || project.status !== "active") {
    throw new Error("Tenant introuvable ou suspendu pour ce host.");
  }
  return project;
}
