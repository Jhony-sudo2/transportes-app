import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CongressesPageClient } from "@/components/domain/CongressesPageClient";
import { CongressListSchema } from "@/lib/validators/congress";
import { InstitutionListSchema } from "@/lib/validators/institution";
import { UserSchema } from "@/lib/validators/user";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function CongressesManagementPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const meRes = await serverFetch(`${BASE}/api/users/me`, { cache: "no-store" });
  if (meRes.status === 401) redirect("/login");

  const rawMe: unknown = await meRes.json();
  const parsedMe = UserSchema.safeParse(rawMe);
  const linkedInstitutions = parsedMe.success ? parsedMe.data.linkedInstitutions : [];

  const congressFetches =
    linkedInstitutions.length > 0
      ? linkedInstitutions.map((institutionId) =>
          serverFetch(`${BASE}/api/congresses?institutionId=${institutionId}&size=100`, {
            cache: "no-store",
          }),
        )
      : [serverFetch(`${BASE}/api/congresses?size=100`, { cache: "no-store" })];

  const [institutionsRes, ...congressResponses] = await Promise.all([
    serverFetch(`${BASE}/api/institutions`, { cache: "no-store" }),
    ...congressFetches,
  ]);

  if (institutionsRes.status === 401) redirect("/login");

  const rawInstitutions: unknown = await institutionsRes.json();
  const parsedInstitutions = InstitutionListSchema.safeParse(rawInstitutions);
  const institutions = parsedInstitutions.success ? parsedInstitutions.data.items : [];

  const allCongresses: import("@/lib/validators/congress").CongressData[] = [];
  const seenIds = new Set<string>();
  for (const res of congressResponses) {
    if (res.status === 401) redirect("/login");
    const raw: unknown = await res.json();
    const parsed = CongressListSchema.safeParse(raw);
    if (parsed.success) {
      for (const c of parsed.data.items) {
        if (!seenIds.has(c.id)) {
          seenIds.add(c.id);
          allCongresses.push(c);
        }
      }
    }
  }

  return (
    <CongressesPageClient
      congresses={allCongresses}
      institutions={institutions}
    />
  );
}
