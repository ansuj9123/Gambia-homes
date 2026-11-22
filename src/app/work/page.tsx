import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Your verification work — Gambia Homes" };

const when = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—");

export default async function WorkPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/work");
  const me = session.user;
  if (!["FIELD_AGENT", "LAWYER", "SURVEYOR", "ADMIN"].includes(me.role)) notFound();

  const cases = await db.verificationOrder.findMany({
    where: me.role === "ADMIN" ? { status: "IN_PROGRESS" } : { OR: [{ fieldAgentId: me.id }, { lawyerId: me.id }, { surveyorId: me.id }] },
    include: { property: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
  });

  const myTask = (c: (typeof cases)[number]) =>
    [
      c.lawyerId === me.id && `Registry search${c.registrySearchedAt ? " ✓" : ""}`,
      c.fieldAgentId === me.id && `Site visit${c.siteVisitedAt ? " ✓" : ""}`,
      c.surveyorId === me.id && `GPS survey${c.surveyedAt ? " ✓" : ""}`,
    ]
      .filter(Boolean)
      .join(" · ") || "All stages (admin)";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Your verification work</h1>
      <p className="mb-6 text-sm text-slate-500">Cases assigned to you. Open one to record findings and upload photos or documents.</p>
      {cases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No cases assigned to you right now.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={me.role === "ADMIN" ? `/admin/verifications/${c.id}` : `/work/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <span>
                  <span className="font-medium">{c.property.title}</span>
                  <span className="block text-sm text-slate-500">
                    {c.property.area} · {c.level === "FULL" ? "Full" : "Basic"} report · GH-{c.id.slice(-8).toUpperCase()}
                  </span>
                </span>
                <span className="text-right text-sm">
                  <span className="block font-medium">{myTask(c)}</span>
                  <span className="text-slate-500">
                    {c.status === "COMPLETE" ? "Published" : c.status === "AWAITING_PAYMENT" ? "Awaiting payment" : `Due ${when(c.dueDate)}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
