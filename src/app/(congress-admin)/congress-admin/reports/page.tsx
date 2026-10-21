import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CongressAdminReportsClient } from "@/components/domain/CongressAdminReportsClient";
import { fetchAdminCongresses } from "@/lib/api/fetch-admin-congresses";

export default async function CongressAdminReportsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const congresses = await fetchAdminCongresses();

  return <CongressAdminReportsClient congresses={congresses} />;
}
