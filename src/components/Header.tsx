import Link from "next/link";
import { CurrencySelect } from "./CurrencyProvider";
import type { AccountUser } from "./AccountProvider";

const NAV = [
  { href: "/search?purpose=SALE", label: "Buy" },
  { href: "/search?purpose=RENT", label: "Rent" },
  { href: "/search?purpose=SALE&type=LAND", label: "Land" },
  { href: "/how-it-works", label: "Buying from abroad" },
  { href: "/saved", label: "Saved" },
];

export function Header({ user }: { user: AccountUser | null }) {
  const firstName = user?.name?.split(" ")[0] || "Account";
  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-ocean-900">
          <span className="flex h-8 w-8 flex-col overflow-hidden rounded-md" aria-hidden>
            <span className="flex-1 bg-[#ce1126]" />
            <span className="h-0.5 bg-white" />
            <span className="flex-1 bg-[#0c1c8c]" />
            <span className="h-0.5 bg-white" />
            <span className="flex-1 bg-[#3a7728]" />
          </span>
          <span className="text-lg">Gambia Homes</span>
        </Link>
        <nav className="order-3 flex w-full gap-4 overflow-x-auto text-sm font-medium text-slate-700 md:order-none md:w-auto">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-brand-700">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <CurrencySelect />
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="text-sm font-medium text-slate-700 hover:text-brand-700">Admin</Link>
          )}
          {(user?.role === "AGENT" || user?.role === "ADMIN") && (
            <Link href="/agent" className="text-sm font-medium text-slate-700 hover:text-brand-700">Agent portal</Link>
          )}
          {user ? (
            <Link href="/account" className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-brand-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ocean-900 text-xs font-bold text-white">
                {firstName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{firstName}</span>
            </Link>
          ) : (
            <Link href="/signin" className="text-sm font-medium text-slate-700 hover:text-brand-700">Sign in</Link>
          )}
          <Link
            href="/list-property"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            List a property
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-slate-600 md:grid-cols-3">
        <div>
          <p className="font-semibold text-slate-900">Gambia Homes</p>
          <p className="mt-1">Verified property in The Gambia, for Gambians at home and abroad.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Stay safe</p>
          <p className="mt-1">
            Never send a deposit by mobile money or bank transfer before a property is verified. Pay only through a
            lawyer&apos;s client account or our escrow partner.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Development build</p>
          <p className="mt-1">All listings, agents and phone numbers shown are sample data. Currency rates are approximate.</p>
        </div>
      </div>
    </footer>
  );
}
