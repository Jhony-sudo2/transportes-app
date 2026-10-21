import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CallsPageClient } from "@/components/domain/CallsPageClient";
import { getSession } from "@/lib/auth/session";
import { fetchAdminCongresses } from "@/lib/api/fetch-admin-congresses";

export default async function CallsPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect("/login");

  const congresses = await fetchAdminCongresses();

  return (
    <div className="flex flex-col gap-6" data-testid="congress-admin-calls-page">
      <PageHeader
        title="Convocatorias"
        description="Gestiona las convocatorias de tus congresos."
      />
      <CallsPageClient congresses={congresses} />
    </div>
  );
}
