import { OperationsPage } from "@/components/domain/OperationsPage";
import { MaintenanceWorkspace } from "@/components/domain/MaintenanceWorkspace";
export default function Page() {
  return (
    <OperationsPage title="Taller y mantenimiento de buses" roles={["SUCURSAL_ADMIN"]} branchScope>
      {({ user, branchId }) =>
        branchId ? <MaintenanceWorkspace userId={user.id} branchId={branchId} /> : null
      }
    </OperationsPage>
  );
}
