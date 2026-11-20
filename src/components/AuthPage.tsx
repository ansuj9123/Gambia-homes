import { redirect } from "next/navigation";
import { auth, safeRedirect, socialProviders } from "@/auth";
import { signInWithProvider } from "@/app/account-actions";
import { AuthTabs } from "./AuthForms";

export async function AuthPage({ mode, callbackUrl: rawCallback }: { mode: "signin" | "signup"; callbackUrl?: string }) {
  const callbackUrl = safeRedirect(rawCallback);
  if ((await auth())?.user) redirect(callbackUrl);

  const social = [
    socialProviders.google && { id: "google", label: "Continue with Google" },
    socialProviders.apple && { id: "apple", label: "Continue with Apple" },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
      <p className="mt-1 text-slate-600">
        Save properties and searches, get alerts, and track your verification reports, from home or abroad.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {social.length > 0 && (
          <div className="mb-5 space-y-2">
            {social.map((s) => (
              <form key={s.id} action={signInWithProvider}>
                <input type="hidden" name="provider" value={s.id} />
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
                <button className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">{s.label}</button>
              </form>
            ))}
            <p className="pt-2 text-center text-xs uppercase tracking-wide text-slate-400">or</p>
          </div>
        )}
        <AuthTabs callbackUrl={callbackUrl} mode={mode} />
      </div>
    </div>
  );
}
