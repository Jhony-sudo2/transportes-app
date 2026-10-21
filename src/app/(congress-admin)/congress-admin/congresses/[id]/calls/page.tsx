import "server-only";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { CallsScopedPageClient } from "@/components/domain/CallsScopedPageClient";
import { CongressSchema } from "@/lib/validators/congress";
import { CallListSchema } from "@/lib/validators/call";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function CongressCallsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const { id } = await params;

  const [congressRes, callsRes] = await Promise.all([
    fetch(`${BASE}/api/congresses/${id}`, { cache: "no-store" }),
    fetch(`${BASE}/api/congresses/${id}/calls`, { cache: "no-store" }),
  ]);

  if (congressRes.status === 401 || callsRes.status === 401) {
    redirect("/login");
  }

  if (congressRes.status === 404) {
    redirect("/congress-admin/congresses");
  }

  const rawCongress: unknown = await congressRes.json();
  const rawCalls: unknown = await callsRes.json();

  const parsedCongress = CongressSchema.safeParse(rawCongress);
  const parsedCalls = CallListSchema.safeParse(rawCalls);

  const congress = parsedCongress.success ? parsedCongress.data : null;
  const calls = parsedCalls.success ? parsedCalls.data.items : [];

  if (congress === null) {
    redirect("/congress-admin/congresses");
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <CallsScopedPageClient
        congressId={id}
        congressName={congress.name}
        initialCalls={calls}
      />
    </Suspense>
  );
}
