import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { UserListSchema } from "@/lib/validators/user";
import { InstitutionListSchema } from "@/lib/validators/institution";
import { UsersPageClient } from "@/components/domain/UsersPageClient";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function UsersPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const [usersRes, institutionsRes] = await Promise.all([
    serverFetch(`${BASE}/api/users`, { cache: "no-store" }),
    serverFetch(`${BASE}/api/institutions`, { cache: "no-store" }),
  ]);

  if (usersRes.status === 401 || institutionsRes.status === 401) {
    redirect("/login");
  }

  const [usersRaw, institutionsRaw] = await Promise.all([
    usersRes.json() as Promise<unknown>,
    institutionsRes.json() as Promise<unknown>,
  ]);

  const usersParsed = UserListSchema.safeParse(usersRaw);
  const institutionsParsed = InstitutionListSchema.safeParse(institutionsRaw);

  const users = usersParsed.success ? usersParsed.data.items : [];
  const institutions = institutionsParsed.success ? institutionsParsed.data.items : [];

  return <UsersPageClient users={users} institutions={institutions} />;
}
