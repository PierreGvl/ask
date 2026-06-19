import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { type LicenseTier, projects, subscriptions } from "@/lib/db/schema";

type SubStatus = "active" | "trialing" | "past_due" | "canceled";

/**
 * Applique un événement d'abonnement (manuel ou provider type Stripe).
 * Idempotent par `externalId` (retries webhook). Met à jour le cache
 * `projects.tier` quand l'abonnement est actif/en essai.
 */
export async function applySubscriptionEvent(input: {
  projectId: string;
  tier: LicenseTier;
  status: SubStatus;
  provider?: "manual" | "stripe";
  externalId?: string | null;
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  const values = {
    projectId: input.projectId,
    tier: input.tier,
    status: input.status,
    provider: input.provider ?? "stripe",
    externalId: input.externalId ?? null,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    updatedAt: new Date(),
  };

  const existing = input.externalId
    ? await db.query.subscriptions.findFirst({
        where: eq(subscriptions.externalId, input.externalId),
        columns: { id: true },
      })
    : undefined;

  if (existing) {
    await db
      .update(subscriptions)
      .set(values)
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values(values);
  }

  // Le tier effectif suit l'abonnement actif ; à l'annulation, retour en free.
  const effectiveTier: LicenseTier =
    input.status === "active" || input.status === "trialing"
      ? input.tier
      : "free";
  await db
    .update(projects)
    .set({ tier: effectiveTier, updatedAt: new Date() })
    .where(eq(projects.id, input.projectId));
}
