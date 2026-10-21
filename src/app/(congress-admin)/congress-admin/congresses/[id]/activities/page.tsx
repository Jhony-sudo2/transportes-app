import "server-only";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { ActivitiesScopedPageClient } from "@/components/domain/ActivitiesScopedPageClient";
import { CongressSchema } from "@/lib/validators/congress";
import { ActivityListSchema } from "@/lib/validators/activity";

const BASE = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export default async function CongressActivitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const { id } = await params;

  const [congressRes, activitiesRes] = await Promise.all([
    fetch(`${BASE}/api/congresses/${id}`, { cache: "no-store" }),
    fetch(`${BASE}/api/congresses/${id}/activities`, { cache: "no-store" }),
  ]);

  if (congressRes.status === 401 || activitiesRes.status === 401) {
    redirect("/login");
  }

  if (congressRes.status === 404) {
    redirect("/congress-admin/congresses");
  }

  const rawCongress: unknown = await congressRes.json();
  const rawActivities: unknown = await activitiesRes.json();

  const parsedCongress = CongressSchema.safeParse(rawCongress);
  const parsedActivities = ActivityListSchema.safeParse(rawActivities);

  const congress = parsedCongress.success ? parsedCongress.data : null;
  const activities = parsedActivities.success ? parsedActivities.data.items : [];

  if (congress === null) {
    redirect("/congress-admin/congresses");
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <ActivitiesScopedPageClient
        congressId={id}
        congressName={congress.name}
        initialActivities={activities}
      />
    </Suspense>
  );
}
