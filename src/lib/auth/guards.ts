import "server-only";

import { redirect } from "next/navigation";
import type { Role, Session } from "@/types/auth";
import { getSession } from "./session";

export async function requireRole(role: Role): Promise<Session> {
  const session = await getSession();

  if (session === null) {
    redirect("/login");
  }

  if (!session.roles.includes(role)) {
    redirect("/");
  }

  return session;
}

// Use when a page must be accessible by any of several roles.
// Example: requireAnyRole("SYSTEM_ADMIN", "CONGRESS_ADMIN")
export async function requireAnyRole(...roles: [Role, ...Role[]]): Promise<Session> {
  const session = await getSession();

  if (session === null) {
    redirect("/login");
  }

  const hasMatch = roles.some((r) => session.roles.includes(r));
  if (!hasMatch) {
    redirect("/");
  }

  return session;
}
