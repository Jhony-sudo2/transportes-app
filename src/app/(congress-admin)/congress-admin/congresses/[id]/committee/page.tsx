import "server-only";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { CommitteeScopedPageClient } from "@/components/domain/CommitteeScopedPageClient";
import { CongressSchema } from "@/lib/validators/congress";
import { CommitteeMemberListSchema } from "@/lib/validators/committee";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function CongressCommitteePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const { id } = await params;

  const [congressRes, committeeRes] = await Promise.all([
    serverFetch(`${BASE}/api/congresses/${id}`, { cache: "no-store" }),
    serverFetch(`${BASE}/api/congresses/${id}/committee`, { cache: "no-store" }),
  ]);

  if (congressRes.status === 401 || committeeRes.status === 401) {
    redirect("/login");
  }

  if (congressRes.status === 404) {
    redirect("/congress-admin/congresses");
  }

  const rawCongress: unknown = await congressRes.json();
  const rawCommittee: unknown = await committeeRes.json();

  const parsedCongress = CongressSchema.safeParse(rawCongress);
  const parsedCommittee = CommitteeMemberListSchema.safeParse(rawCommittee);

  const congress = parsedCongress.success ? parsedCongress.data : null;
  const members = parsedCommittee.success ? parsedCommittee.data.items : [];

  if (congress === null) {
    redirect("/congress-admin/congresses");
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <CommitteeScopedPageClient
        congressId={id}
        congressName={congress.name}
        initialMembers={members}
      />
    </Suspense>
  );
}
