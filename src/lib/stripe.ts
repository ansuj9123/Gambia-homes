import Stripe from "stripe";

let client: Stripe | null | undefined;

/** Stripe client, or null when STRIPE_SECRET_KEY isn't set (payments switched off). */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return (client = null);
  if (/^(sk|rk)_live_/.test(key) && process.env.NODE_ENV !== "production") {
    throw new Error("Refusing to use a live Stripe key outside production. Use a sk_test_ key locally.");
  }
  return (client = new Stripe(key));
}

export const paymentsEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Verifies a webhook signature locally (no network call). Throws if invalid. */
export function constructWebhookEvent(body: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  if (!signature) throw new Error("Missing Stripe-Signature header");
  const verifier = getStripe() ?? new Stripe("sk_test_webhook_verification_only");
  return verifier.webhooks.constructEvent(body, signature, secret);
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
