import { OperationsPage } from "@/components/domain/OperationsPage";
import { AnalyticsWorkspace } from "@/components/domain/AnalyticsWorkspace";

export default function SystemAdminReportsPage() {
  return (
    <OperationsPage title="Informes globales" roles={["ADMIN"]}>
      {() => <AnalyticsWorkspace />}
    </OperationsPage>
  );
}
