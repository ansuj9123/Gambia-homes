// Sends signed, fake Stripe events to the running dev server and checks the
// database. No Stripe account or network needed.
//   1. Set STRIPE_WEBHOOK_SECRET in .env (any value starting whsec_ works locally)
//   2. npm run dev
//   3. npm run test:webhook
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new Stripe("sk_test_webhook_test_only");

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
};

async function send(event: object, signature?: string) {
  const payload = JSON.stringify(event);
  const header = signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret: secret! });
  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": header },
    body: payload,
  });
  return res.status;
}

const sessionEvent = (type: string, session: Record<string, unknown>) => ({
  id: `evt_test_${Math.random().toString(36).slice(2)}`,
  object: "event",
  type,
  data: { object: { object: "checkout.session", ...session } },
});

async function main() {
  if (!secret) throw new Error("Set STRIPE_WEBHOOK_SECRET in .env first.");
  const property = await db.property.findFirstOrThrow({ where: { status: "LIVE" } });
  const order = await db.verificationOrder.create({
    data: { level: "FULL", priceGbp: 449, name: "Webhook Test", email: "webhook.test@example.com", propertyId: property.id },
  });
  const payment = await db.payment.create({
    data: { kind: "VERIFICATION_REPORT", amount: 44900, currency: "gbp", verificationOrderId: order.id, providerSessionId: `cs_test_${order.id}` },
  });
  const session = { id: payment.providerSessionId, payment_status: "paid", amount_total: 44900, currency: "gbp", payment_intent: `pi_test_${order.id}`, metadata: { paymentId: payment.id } };

  try {
    check("bad signature is rejected (400)", (await send(sessionEvent("checkout.session.completed", session), "t=1,v1=bad")) === 400);
    check("still unpaid after bad signature", (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status === "PENDING");

    check("wrong amount is accepted but not fulfilled", (await send(sessionEvent("checkout.session.completed", { ...session, amount_total: 100 }))) === 200);
    check("still unpaid after wrong amount", (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status === "PENDING");

    check("valid checkout.session.completed returns 200", (await send(sessionEvent("checkout.session.completed", session))) === 200);
    const paid = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const startedOrder = await db.verificationOrder.findUniqueOrThrow({ where: { id: order.id } });
    check("payment marked PAID with PaymentIntent id", paid.status === "PAID" && paid.providerPaymentId === session.payment_intent);
    check("order moved to IN_PROGRESS with paidAt", startedOrder.status === "IN_PROGRESS" && startedOrder.paidAt !== null);

    check("duplicate event is handled (200)", (await send(sessionEvent("checkout.session.completed", session))) === 200);
    const paidAgain = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    check("duplicate event changes nothing", paidAgain.paidAt?.getTime() === paid.paidAt?.getTime());

    const refund = { id: "evt_test_refund", object: "event", type: "charge.refunded", data: { object: { object: "charge", payment_intent: session.payment_intent } } };
    check("charge.refunded returns 200", (await send(refund)) === 200);
    check("payment marked REFUNDED", (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status === "REFUNDED");
  } finally {
    await db.payment.deleteMany({ where: { verificationOrderId: order.id } });
    await db.verificationOrder.delete({ where: { id: order.id } });
    await db.$disconnect();
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll webhook checks passed");
  process.exit(failures ? 1 : 0);
}

main();
