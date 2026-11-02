import { OperationsPage } from "@/components/domain/OperationsPage";
import { CashDesk } from "@/components/domain/CashDesk";
export default function Page() {
  return (
    <OperationsPage title="Caja de la sucursal" roles={["SUCURSAL_ADMIN"]} branchScope>
      {({ user, branchId }) => <CashDesk userId={user.id} {...(branchId ? { branchId } : {})} />}
    </OperationsPage>
  );
}
