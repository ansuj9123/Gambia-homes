import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/auth";
import { db } from "@/lib/db";
import { parseSearch } from "@/lib/search";
import { describeFilters, describeSearch } from "@/lib/describe-search";
import { deleteSavedSearch, payVerificationOrder, signOutAction, updateSavedSearch } from "@/app/account-actions";
import { paymentsEnabled } from "@/lib/stripe";
import { PropertyCard } from "@/components/PropertyCard";
import { ChangePasswordForm, ProfileForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Your account — Gambia Homes" };

const STATUS_LABEL: Record<string, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  IN_PROGRESS: "Checks in progress",
  COMPLETE: "Report ready",
};

const when = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const paymentError = (await searchParams).payment === "error";
  const user = await currentUser();
  if (!user) redirect("/signin?callbackUrl=/account");

  const [saved, searches, orders, enquiries] = await Promise.all([
    db.savedProperty.findMany({
      where: { userId: user.id, property: { status: "LIVE" } },
      include: { property: true },
      orderBy: { createdAt: "desc" },
    }),
    db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.verificationOrder.findMany({ where: { userId: user.id }, include: { property: true }, orderBy: { createdAt: "desc" } }),
    db.enquiry.findMany({ where: { userId: user.id }, include: { property: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const section = "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hello{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-slate-500">
            {[user.email, user.phone].filter(Boolean).join(" · ")} · member since {when(user.createdAt)}
          </p>
        </div>
        <form action={signOutAction}>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Sign out</button>
        </form>
      </div>

      <section className={section}>
        <h2 className="mb-3 text-lg font-semibold">Verification reports</h2>
        {paymentError && (
          <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">We couldn&apos;t start the payment. Please try again in a moment.</p>
        )}
        {orders.length === 0 ? (
          <p className="text-sm text-slate-600">
            No reports yet. Order one from any listing before you pay a deposit.{" "}
            <Link href="/how-it-works" className="text-brand-700 hover:underline">How it works</Link>
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <Link href={`/property/${o.property.slug}`} className="font-medium text-brand-700 hover:underline">{o.property.title}</Link>
                  <span className="block text-slate-500">{o.level === "FULL" ? "Full report with survey" : "Basic report"} · £{o.priceGbp} · ordered {when(o.createdAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{STATUS_LABEL[o.status] ?? o.status}</span>
                  {o.status === "AWAITING_PAYMENT" && paymentsEnabled() && (
                    <form action={payVerificationOrder}>
                      <input type="hidden" name="id" value={o.id} />
                      <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Pay £{o.priceGbp}</button>
                    </form>
                  )}
                  {o.paidAt && !o.reportPublishedAt && <span className="text-xs text-slate-500">paid {when(o.paidAt)}</span>}
                  {o.reportPublishedAt && (
                    <a href={`/api/reports/${o.id}`} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Download report (PDF)</a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="saved">
        <h2 className="mb-3 text-lg font-semibold">Saved properties ({saved.length})</h2>
        {saved.length === 0 ? (
          <p className={`${section} text-sm text-slate-600`}>Tap ♡ on any listing to save it here.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((s) => <PropertyCard key={s.propertyId} p={s.property} />)}
          </div>
        )}
      </section>

      <section id="searches" className={section}>
        <h2 className="mb-1 text-lg font-semibold">Saved searches</h2>
        <p className="mb-3 text-sm text-slate-500">
          Choose how to hear about new matches. Email and WhatsApp alerts start sending once those services are connected.
        </p>
        {searches.length === 0 ? (
          <p className="text-sm text-slate-600">
            Use <strong>Save search</strong> on the <Link href="/search" className="text-brand-700 hover:underline">search page</Link> to get alerts for new listings.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {searches.map((s) => {
              const parsed = parseSearch(Object.fromEntries(new URLSearchParams(s.query)));
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <Link href={`/search?${s.query}`} className="font-medium text-brand-700 hover:underline">{describeSearch(parsed)}</Link>
                    <span className="block text-slate-500">{describeFilters(parsed) || "No extra filters"}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <form action={updateSavedSearch} className="flex items-center gap-3">
                      <input type="hidden" name="id" value={s.id} />
                      <label className="flex items-center gap-1"><input type="checkbox" name="alertEmail" defaultChecked={s.alertEmail} /> Email</label>
                      <label className="flex items-center gap-1"><input type="checkbox" name="alertWhatsApp" defaultChecked={s.alertWhatsApp} /> WhatsApp</label>
                      <button className="rounded bg-slate-900 px-2.5 py-1 text-xs text-white">Update</button>
                    </form>
                    <form action={deleteSavedSearch}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs text-red-700 hover:underline">Delete</button>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={section}>
        <h2 className="mb-3 text-lg font-semibold">Your messages and viewing requests</h2>
        {enquiries.length === 0 ? (
          <p className="text-sm text-slate-600">Messages you send to agents will appear here.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {enquiries.map((e) => (
              <li key={e.id} className="py-3">
                <Link href={`/property/${e.property.slug}`} className="font-medium text-brand-700 hover:underline">{e.property.title}</Link>
                <span className="block text-slate-500">
                  {e.kind === "VIDEO_VIEWING" ? "Video viewing request" : "Message"} · {when(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={section}>
        <h2 className="mb-3 text-lg font-semibold">Profile</h2>
        <ProfileForm name={user.name ?? ""} country={user.country ?? ""} />
      </section>

      {user.email && (
        <section id="password" className={section}>
          <h2 className="mb-1 text-lg font-semibold">{user.passwordHash ? "Change password" : "Set a password"}</h2>
          <p className="mb-3 text-sm text-slate-500">For signing in with {user.email}.</p>
          <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
        </section>
      )}
    </div>
  );
}
