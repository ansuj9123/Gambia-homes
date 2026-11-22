import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { caseAccess } from "@/lib/verification";
import { CaseView } from "@/components/CaseView";

export const metadata: Metadata = { title: "Verification case — Gambia Homes" };

export default async function WorkCasePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await auth())?.user) redirect("/signin?callbackUrl=/work");
  const id = (await params).id;
  const access = await caseAccess(id);
  if (!access) notFound();
  if (access.isAdmin) redirect(`/admin/verifications/${id}`);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <Link href="/work" className="text-sm text-slate-500 hover:underline">← Your cases</Link>
      <h1 className="text-2xl font-bold">Case GH-{id.slice(-8).toUpperCase()}</h1>
      <p className="text-sm text-slate-500">
        Record only what you checked yourself. Your findings go into the buyer&apos;s report under your name. Buyer contact details are
        kept private.
      </p>
      <CaseView orderId={id} can={access.can} viewerId={access.user.id} isAdmin={false} />
    </div>
  );
}
