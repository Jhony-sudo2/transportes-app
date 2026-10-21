import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AttendancePageClient } from "@/components/domain/AttendancePageClient";
import { fetchAdminCongresses } from "@/lib/api/fetch-admin-congresses";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ congressId?: string; activityId?: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const { congressId, activityId } = await searchParams;

  const congresses = await fetchAdminCongresses();

  return (
    <AttendancePageClient
      congresses={congresses}
      initialCongressId={congressId}
      initialActivityId={activityId}
    />
  );
}
