import type { Metadata } from "next";
import { currentUser } from "@/auth";
import { currentAgent } from "@/lib/permissions";
import { ListingForm, type ListerDefaults } from "@/components/ListingForm";

export const metadata: Metadata = { title: "List a property — Gambia Homes" };

export default async function ListPropertyPage() {
  const [user, agent] = await Promise.all([currentUser(), currentAgent()]);
  const defaults: ListerDefaults = agent
    ? { contactName: agent.name, agency: agent.agency ?? undefined, phone: agent.phone, email: agent.email ?? user?.email ?? undefined }
    : { contactName: user?.name ?? undefined, phone: user?.phone ?? undefined, email: user?.email ?? undefined };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">List a property</h1>
      <p className="mt-2 text-slate-600">
        Free during launch for agents, developers and owners. After you submit, our team will contact you on WhatsApp to verify the
        listing, so buyers at home and abroad can trust it.
        {agent && " It will appear in your agent portal straight away."}
      </p>
      <div className="mt-6">
        <ListingForm defaults={defaults} />
      </div>
    </div>
  );
}
