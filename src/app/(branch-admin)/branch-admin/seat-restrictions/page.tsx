import { OperationsPage } from "@/components/domain/OperationsPage";
import { SeatRestrictions } from "@/components/domain/SeatRestrictions";
export default function Page() {
  return (
    <OperationsPage title="Bloqueos comerciales de asientos" roles={["SUCURSAL_ADMIN"]} branchScope>
      {({ user, branchId }) =>
        branchId ? <SeatRestrictions userId={user.id} branchId={branchId} canBlockBus /> : null
      }
    </OperationsPage>
  );
}
