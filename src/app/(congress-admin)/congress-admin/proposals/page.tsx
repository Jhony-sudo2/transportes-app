import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalsAdminPageClient } from "@/components/domain/ProposalsAdminPageClient";
import { UserSchema } from "@/lib/validators/user";
import { getSession } from "@/lib/auth/session";
import { serverFetch } from "@/lib/api/server-fetch";
import { fetchAdminCongresses } from "@/lib/api/fetch-admin-congresses";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function ProposalsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const [congresses, meRes] = await Promise.all([
    fetchAdminCongresses(),
    serverFetch(`${BASE}/api/users/me`, { cache: "no-store" }),
  ]);

  if (meRes.status === 401) redirect("/login");

  const rawMe: unknown = await meRes.json();
  const meParsed = UserSchema.safeParse(rawMe);
  const userId = meParsed.success ? meParsed.data.id : session.userId;

  return (
    <div className="flex flex-col gap-6" data-testid="congress-admin-proposals-page">
      <PageHeader
        title="Propuestas"
        description="Revisa y evalua las propuestas recibidas."
      />
      <ProposalsAdminPageClient
        congresses={congresses}
        currentUserId={userId}
      />
    </div>
  );
}
