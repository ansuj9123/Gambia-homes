import { auth } from "@/auth";
import { db } from "./db";

/** The signed-in user if they may manage this listing (admins, or the agent who owns it). */
export async function userWhoCanManage(propertyId: string) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  if (user.role === "ADMIN") return user;
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { agent: { select: { userId: true } } } });
  return property?.agent.userId === user.id ? user : null;
}

/** The agent profile linked to the signed-in user, if any. */
export async function currentAgent() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.agent.findUnique({ where: { userId: session.user.id } });
}
