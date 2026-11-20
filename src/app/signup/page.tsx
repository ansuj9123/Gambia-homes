import type { Metadata } from "next";
import { AuthPage } from "@/components/AuthPage";

export const metadata: Metadata = { title: "Create an account — Gambia Homes" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  return <AuthPage mode="signup" callbackUrl={(await searchParams).callbackUrl} />;
}
