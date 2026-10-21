import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ActivitiesPageClient } from "@/components/domain/ActivitiesPageClient";
import { fetchAdminCongresses } from "@/lib/api/fetch-admin-congresses";

export default async function ActivitiesPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const congresses = await fetchAdminCongresses();

  return <ActivitiesPageClient congresses={congresses} />;
}
