import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { currentUser } from "@/auth";
import { db } from "@/lib/db";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { AccountProvider, type AccountUser } from "@/components/AccountProvider";
import { Footer, Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Gambia Homes — verified property in The Gambia",
  description: "Buy, rent and verify land and homes in The Gambia, from home or abroad.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const u = await currentUser();
  const user: AccountUser | null = u
    ? { id: u.id, name: u.name, email: u.email, phone: u.phone, country: u.country, role: u.role }
    : null;
  const savedIds = u
    ? (await db.savedProperty.findMany({ where: { userId: u.id }, select: { propertyId: true } })).map((s) => s.propertyId)
    : [];

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <CurrencyProvider>
          <AccountProvider user={user} savedIds={savedIds}>
            <Header user={user} />
            <main>{children}</main>
            <Footer />
          </AccountProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
