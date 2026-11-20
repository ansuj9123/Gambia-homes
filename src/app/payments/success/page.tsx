import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { fulfilCheckoutSession } from "@/lib/payments";

export const metadata: Metadata = { title: "Payment — Gambia Homes" };

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const sessionId = (await searchParams).session_id;
  const stripe = getStripe();

  let paid = false;
  if (stripe && sessionId?.startsWith("cs_")) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Fulfil here too, in case the webhook hasn't arrived yet. Safe to repeat.
      paid = (await fulfilCheckoutSession(session)).fulfilled;
    } catch (e) {
      console.error("[payments] could not retrieve session", e);
    }
  }

  const payment = sessionId
    ? await db.payment.findUnique({
        where: { providerSessionId: sessionId },
        include: { verificationOrder: { include: { property: true } } },
      })
    : null;
  const order = payment?.verificationOrder;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {paid && order ? (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">✓</div>
          <h1 className="text-2xl font-bold">Payment received</h1>
          <p className="mt-2 text-slate-600">
            Thank you. Checks on <strong>{order.property.title}</strong> have started. We&apos;ll email {order.email} when your report
            is ready, usually within 5–10 working days.
          </p>
          <p className="mt-1 text-sm text-slate-500">£{(payment!.amount / 100).toFixed(2)} paid by card. Stripe has emailed your receipt.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Confirming your payment</h1>
          <p className="mt-2 text-slate-600">
            We haven&apos;t received confirmation yet. This can take a few minutes for some payment methods. You don&apos;t need to pay
            again; we&apos;ll email you once it&apos;s confirmed.
          </p>
        </>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/account" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Go to your account</Link>
        {order && (
          <Link href={`/property/${order.property.slug}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">Back to property</Link>
        )}
      </div>
    </div>
  );
}
