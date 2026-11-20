import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const metadata: Metadata = { title: "Sign in — Gambia Homes" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  return <AuthPage mode="signin" callbackUrl={(await searchParams).callbackUrl} />;
}
