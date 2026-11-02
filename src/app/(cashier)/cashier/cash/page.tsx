import { OperationsPage } from "@/components/domain/OperationsPage";
import { CashDesk } from "@/components/domain/CashDesk";
export default function Page() {
  return (
    <OperationsPage title="Caja de mi sucursal" roles={["CAJERO"]}>
      {({ user }) => <CashDesk userId={user.id} />}
    </OperationsPage>
  );
}
