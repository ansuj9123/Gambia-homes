import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { constructWebhookEvent } from "@/lib/stripe";
import { fulfilCheckoutSession, markRefunded, markSessionExpired, markSessionFailed } from "@/lib/payments";

// Stripe sends events here. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
export async function POST(req: NextRequest) {
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, req.headers.get("stripe-signature"));
  } catch (e) {
    console.warn("[stripe webhook] rejected:", (e as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfilCheckoutSession(event.data.object);
        break;
      case "checkout.session.async_payment_failed":
        await markSessionFailed(event.data.object);
        break;
      case "checkout.session.expired":
        await markSessionExpired(event.data.object);
        break;
      case "charge.refunded": {
        const pi = event.data.object.payment_intent;
        if (pi) await markRefunded(typeof pi === "string" ? pi : pi.id);
        break;
      }
    }
  } catch (e) {
    console.error("[stripe webhook] handler failed", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
