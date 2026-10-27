import "server-only";
import { notFound, redirect } from "next/navigation";
import { getTransportSession } from "./session";
import type { TransportUser } from "@/lib/validators/auth";

export async function requireTransportPageAccess(role?: TransportUser["role"]["name"]) {
  const user = await getTransportSession();
  if (!user || !user.isActive || user.resetPassword) redirect("/login");
  if (role && user.role.name !== role) notFound();
  return user;
}
