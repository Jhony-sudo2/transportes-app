import "server-only";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { ProposalsScopedPageClient } from "@/components/domain/ProposalsScopedPageClient";
import { CongressSchema } from "@/lib/validators/congress";
import { CallListSchema, type CallData } from "@/lib/validators/call";
import { ProposalListSchema, type ProposalData } from "@/lib/validators/proposal";
import { CommitteeMemberListSchema } from "@/lib/validators/committee";
import { UserSchema } from "@/lib/validators/user";
import { serverFetch } from "@/lib/api/server-fetch";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function CongressProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const { id } = await params;

  const [congressRes, callsRes, committeeRes, meRes] = await Promise.all([
    serverFetch(`${BASE}/api/congresses/${id}`, { cache: "no-store" }),
    serverFetch(`${BASE}/api/congresses/${id}/calls`, { cache: "no-store" }),
    serverFetch(`${BASE}/api/congresses/${id}/committee`, { cache: "no-store" }),
    serverFetch(`${BASE}/api/users/me`, { cache: "no-store" }),
  ]);

  if (
    congressRes.status === 401 ||
    callsRes.status === 401 ||
    committeeRes.status === 401 ||
    meRes.status === 401
  ) {
    redirect("/login");
  }

  if (congressRes.status === 404) {
    redirect("/congress-admin/congresses");
  }

  const rawCongress: unknown = await congressRes.json();
  const rawCalls: unknown = await callsRes.json();
  const rawCommittee: unknown = await committeeRes.json();
  const rawMe: unknown = await meRes.json();

  const parsedCongress = CongressSchema.safeParse(rawCongress);
  const parsedCalls = CallListSchema.safeParse(rawCalls);
  const parsedCommittee = CommitteeMemberListSchema.safeParse(rawCommittee);
  const parsedMe = UserSchema.safeParse(rawMe);

  const congress = parsedCongress.success ? parsedCongress.data : null;

  if (congress === null) {
    redirect("/congress-admin/congresses");
  }

  const calls: CallData[] = parsedCalls.success ? parsedCalls.data.items : [];
  const openCall: CallData | null = calls.find((c) => c.status === "OPEN") ?? null;
  const currentUserId: string = parsedMe.success ? parsedMe.data.id : session.userId;

  const isCommitteeMember: boolean = parsedCommittee.success
    ? parsedCommittee.data.items.some((m) => m.userId === currentUserId)
    : false;

  let proposals: ProposalData[] = [];
  if (openCall !== null) {
    const proposalsRes = await serverFetch(`${BASE}/api/calls/${openCall.id}/proposals`, {
      cache: "no-store",
    });
    if (proposalsRes.ok) {
      const rawProposals: unknown = await proposalsRes.json();
      const parsedProposals = ProposalListSchema.safeParse(rawProposals);
      if (parsedProposals.success) {
        proposals = parsedProposals.data.items;
      }
    }
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <ProposalsScopedPageClient
        congressId={id}
        congressName={congress.name}
        initialProposals={proposals}
        openCall={openCall}
        isCommitteeMember={isCommitteeMember}
      />
    </Suspense>
  );
}
