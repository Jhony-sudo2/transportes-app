import "server-only";

import { CongressListSchema, type CongressData } from "@/lib/validators/congress";
import { UserSchema } from "@/lib/validators/user";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

/**
 * Fetches only the congresses that belong to the current congress admin's linked
 * institutions. Returns an empty array on any parse or network failure.
 *
 * This must be called from Server Components only (uses server-only cookies via
 * serverFetch).
 */
export async function fetchAdminCongresses(): Promise<CongressData[]> {
  const meRes = await serverFetch(`${BASE}/api/users/me`, { cache: "no-store" });
  if (!meRes.ok) return [];

  const rawMe: unknown = await meRes.json();
  const parsedMe = UserSchema.safeParse(rawMe);
  const linkedInstitutions = parsedMe.success ? parsedMe.data.linkedInstitutions : [];

  if (linkedInstitutions.length === 0) {
    return [];
  }

  const responses = await Promise.all(
    linkedInstitutions.map((institutionId) =>
      serverFetch(`${BASE}/api/congresses?institutionId=${institutionId}&size=100`, {
        cache: "no-store",
      }),
    ),
  );

  const allCongresses: CongressData[] = [];
  const seenIds = new Set<string>();

  for (const res of responses) {
    if (!res.ok) continue;
    const raw: unknown = await res.json();
    const parsed = CongressListSchema.safeParse(raw);
    if (!parsed.success) continue;
    for (const c of parsed.data.items) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        allCongresses.push(c);
      }
    }
  }

  return allCongresses;
}
