import { z } from "zod";
import { applySubscriptionEvent } from "@/lib/billing/sync";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Webhook de facturation. SQUELETTE prêt à brancher sur Stripe :
 *
 *   TODO pour activer Stripe :
 *     1. npm i stripe
 *     2. Vérifier la signature : stripe.webhooks.constructEvent(rawBody,
 *        req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)
 *     3. Mapper price_id → tier (ex. via metadata du Price/Subscription) et
 *        l'événement (customer.subscription.updated/deleted) → applySubscriptionEvent.
 *
 * En attendant Stripe, le endpoint accepte un payload générique signé par un
 * secret partagé (header x-billing-secret = STRIPE_WEBHOOK_SECRET), utile pour
 * piloter les abonnements depuis un script interne.
 */

const schema = z.object({
  projectId: z.string().uuid(),
  tier: z.enum(["free", "pro", "domaine"]),
  status: z.enum(["active", "trialing", "past_due", "canceled"]),
  externalId: z.string().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Facturation non configurée", { status: 501 });
  }
  if (req.headers.get("x-billing-secret") !== env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Signature invalide", { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Payload invalide", { status: 400 });
  }

  await applySubscriptionEvent({
    projectId: parsed.data.projectId,
    tier: parsed.data.tier,
    status: parsed.data.status,
    provider: "stripe",
    externalId: parsed.data.externalId ?? null,
    currentPeriodEnd: parsed.data.currentPeriodEnd
      ? new Date(parsed.data.currentPeriodEnd)
      : null,
  });
  return Response.json({ ok: true });
}
