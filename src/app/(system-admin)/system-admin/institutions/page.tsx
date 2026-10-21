import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { InstitutionListSchema } from "@/lib/validators/institution";
import { InstitutionsPageClient } from "@/components/domain/InstitutionsPageClient";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function InstitutionsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const res = await serverFetch(`${BASE}/api/institutions`, { cache: "no-store" });

  if (res.status === 401) {
    redirect("/login");
  }

  const raw = (await res.json()) as unknown;
  const parsed = InstitutionListSchema.safeParse(raw);
  const institutions = parsed.success ? parsed.data.items : [];

  return <InstitutionsPageClient institutions={institutions} />;
}
