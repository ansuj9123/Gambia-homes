import Link from "next/link";
import type { Metadata } from "next";
import { VERIFICATION_PRODUCTS } from "@/lib/constants";

export const metadata: Metadata = { title: "Buying property in The Gambia from abroad — Gambia Homes" };

const STEPS = [
  { title: "Search verified listings", body: "Filter by area, price and plot size, in pounds, dollars, euros or dalasi. Prefer listings that are site verified or better." },
  { title: "Book a live video viewing", body: "A field agent walks the plot or house with you on WhatsApp video, at a time that suits your time zone." },
  { title: "Order a verification report", body: "A partner lawyer searches the registry, a surveyor records GPS boundaries, and we confirm with the alkalo and neighbours." },
  { title: "Agree the price", body: "Negotiate with the seller directly or with our help. Nothing is paid yet." },
  { title: "Pay safely", body: "Money goes to a partner lawyer's client account or escrow, and is released to the seller only when the transfer is complete." },
  { title: "Receive your documents", body: "Scanned transfer papers, lease and GPS boundary map are stored in your account. Originals are sent or held by the lawyer." },
  { title: "Build, rent or manage", body: "Optional: vetted builders with staged payments and photo reports, or property management with rent collection." },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Buying property in The Gambia from abroad</h1>
      <p className="mt-2 text-lg text-slate-600">Seven steps from search to keys, without relying on luck or a middleman.</p>

      <ol className="mt-8 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
            <span>
              <span className="font-semibold">{s.title}</span>
              <span className="block text-slate-600">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-2xl font-bold">Verification reports</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {VERIFICATION_PRODUCTS.map((p) => (
          <div key={p.value} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-semibold">{p.label}</p>
            <p className="text-2xl font-bold text-brand-700">£{p.priceGbp}</p>
            <p className="mt-2 text-sm text-slate-600">{p.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-500">Order a report from any listing page. Reports state which checks were done and their limits.</p>

      <div className="mt-12 rounded-xl bg-red-50 p-5 text-red-900">
        <h2 className="text-lg font-semibold">Warning signs of a land scam</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Asked to pay a deposit before a viewing or any document check.</li>
          <li>Seller refuses a lawyer or wants payment by mobile money to a personal number.</li>
          <li>The same plot appears with different sellers or prices.</li>
          <li>Papers in a different name from the seller&apos;s ID.</li>
          <li>Pressure to decide today because &ldquo;another buyer is waiting&rdquo;.</li>
        </ul>
      </div>

      <Link href="/search?trust=3" className="mt-8 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
        Browse verified listings
      </Link>
    </div>
  );
}
