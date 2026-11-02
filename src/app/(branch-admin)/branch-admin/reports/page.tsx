import { OperationsPage } from "@/components/domain/OperationsPage";
import { AnalyticsWorkspace } from "@/components/domain/AnalyticsWorkspace";
export default function Page() {
  return (
    <OperationsPage title="Informes de sucursal" roles={["SUCURSAL_ADMIN"]} branchScope>
      {({ branchId }) => (branchId ? <AnalyticsWorkspace branchId={branchId} /> : null)}
    </OperationsPage>
  );
}
