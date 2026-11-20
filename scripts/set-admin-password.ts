// Sets the admin account's password to ADMIN_PASSWORD from .env, without
// touching any other data. Creates the admin account if it doesn't exist.
//   1. Edit ADMIN_EMAIL / ADMIN_PASSWORD in .env
//   2. npm run admin:password
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email) throw new Error("Set ADMIN_EMAIL in .env");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD in .env must be at least 8 characters");

  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { email }, data: { passwordHash, role: "ADMIN" } });
    console.log(`Updated the password for ${email}.`);
  } else {
    await db.user.create({ data: { email, name: "Admin", role: "ADMIN", passwordHash } });
    console.log(`Created admin account ${email}.`);
  }
  if (password === "change-me-dev-only") {
    console.warn("Warning: this is still the default development password. Change it before deploying.");
  }
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
