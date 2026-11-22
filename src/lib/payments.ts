import type Stripe from "stripe";
import { db } from "./db";
import { getStripe, siteUrl } from "./stripe";
import { VERIFICATION_PRODUCTS } from "./constants";

type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

/** Creates a Payment row and a Stripe Checkout Session for a verification order. */
export async function createVerificationCheckout(orderId: string, origin = siteUrl()): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Card payments aren't set up yet." };

  const order = await db.verificationOrder.findUnique({ where: { id: orderId }, include: { property: true } });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "AWAITING_PAYMENT") return { ok: false, error: "This order is already paid." };

  const product = VERIFICATION_PRODUCTS.find((p) => p.value === order.level);
  const amount = order.priceGbp * 100;
  const payment = await db.payment.create({
    data: {
      kind: "VERIFICATION_REPORT",
      amount,
      currency: "gbp",
      userId: order.userId,
      verificationOrderId: order.id,
    },
  });

  try {
    const metadata = { paymentId: payment.id, verificationOrderId: order.id };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: amount,
              product_data: {
                name: `${product?.label ?? "Verification report"}: ${order.property.title}`.slice(0, 250),
                description: product?.detail,
              },
            },
          },
        ],
        customer_email: order.email,
        client_reference_id: payment.id,
        metadata,
        payment_intent_data: { metadata },
        success_url: `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/property/${order.property.slug}?payment=cancelled`,
      },
      { idempotencyKey: `checkout-${payment.id}` },
    );
    await db.payment.update({ where: { id: payment.id }, data: { providerSessionId: session.id } });
    if (!session.url) return { ok: false, error: "Stripe did not return a payment page." };
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[payments] checkout session failed", e);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { ok: false, error: "We couldn't start the payment. Please try again." };
  }
}

const paymentIntentId = (s: Stripe.Checkout.Session) =>
  typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);

async function paymentForSession(session: Stripe.Checkout.Session) {
  return (
    (await db.payment.findUnique({ where: { providerSessionId: session.id } })) ??
    (session.metadata?.paymentId ? await db.payment.findUnique({ where: { id: session.metadata.paymentId } }) : null)
  );
}

/**
 * Marks a payment paid and starts the order. Safe to call more than once
 * (webhook retries and the success page both call it).
 */
export async function fulfilCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return { fulfilled: false, reason: session.payment_status };
  const payment = await paymentForSession(session);
  if (!payment) return { fulfilled: false, reason: "unknown session" };
  if (payment.status === "PAID") return { fulfilled: true, reason: "already paid" };

  if (session.amount_total !== payment.amount || session.currency !== payment.currency) {
    console.error("[payments] amount mismatch", { session: session.id, expected: payment.amount, got: session.amount_total });
    return { fulfilled: false, reason: "amount mismatch" };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: now, providerSessionId: session.id, providerPaymentId: paymentIntentId(session) },
    });
    if (updated.count === 0 || !payment.verificationOrderId) return;
    await tx.verificationOrder.updateMany({
      where: { id: payment.verificationOrderId, status: "AWAITING_PAYMENT" },
      data: { status: "IN_PROGRESS", paidAt: now },
    });
  });
  return { fulfilled: true, reason: "paid" };
}

export async function markSessionExpired(session: Stripe.Checkout.Session) {
  await db.payment.updateMany({ where: { providerSessionId: session.id, status: "PENDING" }, data: { status: "EXPIRED" } });
}

export async function markSessionFailed(session: Stripe.Checkout.Session) {
  await db.payment.updateMany({ where: { providerSessionId: session.id, status: "PENDING" }, data: { status: "FAILED" } });
}

export async function markRefunded(paymentIntent: string) {
  await db.payment.updateMany({ where: { providerPaymentId: paymentIntent, status: "PAID" }, data: { status: "REFUNDED" } });
}
