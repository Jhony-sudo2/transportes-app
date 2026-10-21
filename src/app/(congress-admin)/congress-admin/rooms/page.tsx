import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoomsPageClient } from "@/components/domain/RoomsPageClient";
import { fetchAdminCongresses } from "@/lib/api/fetch-admin-congresses";

export default async function RoomsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const congresses = await fetchAdminCongresses();

  return <RoomsPageClient congresses={congresses} />;
}
