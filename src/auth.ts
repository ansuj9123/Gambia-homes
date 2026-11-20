import NextAuth, { type DefaultSession } from "next-auth";
import "next-auth/jwt"; // brings the JWT type into scope for the augmentation below
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { normalizePhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: string } & DefaultSession["user"];
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const providers: Provider[] = [
  Credentials({
    id: "password",
    name: "Email and password",
    credentials: { email: {}, password: {} },
    async authorize(c) {
      const email = str(c.email).toLowerCase();
      const password = typeof c.password === "string" ? c.password : "";
      if (!email || !password) return null;
      const user = await db.user.findUnique({ where: { email } });
      if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
  Credentials({
    id: "phone",
    name: "Phone code",
    credentials: { phone: {}, code: {}, name: {} },
    async authorize(c) {
      const phone = normalizePhone(str(c.phone));
      if (!phone || !(await verifyOtp(phone, str(c.code)))) return null;
      const name = str(c.name) || null;
      const user = await db.user.upsert({
        where: { phone },
        update: { phoneVerified: new Date() },
        create: { phone, phoneVerified: new Date(), name },
      });
      // The code proves they own this number, so link an unclaimed agent profile with it.
      let role = user.role;
      const hasAgent = await db.agent.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!hasAgent) {
        const agent = await db.agent.findFirst({ where: { phone, userId: null } });
        if (agent) {
          await db.agent.update({ where: { id: agent.id }, data: { userId: user.id } });
          if (role === "USER") {
            role = "AGENT";
            await db.user.update({ where: { id: user.id }, data: { role } });
          }
        }
      }
      return { id: user.id, name: user.name, email: user.email, role };
    },
  }),
];

// Social sign-in switches on when keys are present in .env.
export const socialProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  apple: Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
};
if (socialProviders.google) providers.push(Google);
if (socialProviders.apple) providers.push(Apple);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/signin" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        return token;
      }
      // Re-check the account on each request: deleted accounts are signed out,
      // and role changes (e.g. becoming an agent or admin) apply straight away.
      if (!token.id) return null;
      const current = await db.user.findUnique({ where: { id: token.id }, select: { role: true } });
      if (!current) return null;
      token.role = current.role;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id ?? "";
      session.user.role = token.role ?? "USER";
      return session;
    },
  },
});

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

// Only allow same-site relative redirects after sign-in.
export function safeRedirect(target: unknown, fallback = "/account") {
  return typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}
