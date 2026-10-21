import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CommitteePageClient } from "@/components/domain/CommitteePageClient";
import { getSession } from "@/lib/auth/session";
import { fetchAdminCongresses } from "@/lib/api/fetch-admin-congresses";

export default async function CommitteePage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const congresses = await fetchAdminCongresses();

  return (
    <div className="flex flex-col gap-6" data-testid="congress-admin-committee-page">
      <PageHeader
        title="Comite cientifico"
        description="Gestiona los miembros del comite de evaluacion."
      />
      <CommitteePageClient congresses={congresses} />
    </div>
  );
}
