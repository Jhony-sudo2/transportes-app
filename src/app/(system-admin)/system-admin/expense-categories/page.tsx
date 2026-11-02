import { OperationsPage } from "@/components/domain/OperationsPage";
import { ExpenseCategories } from "@/components/domain/MaintenanceWorkspace";
export default function Page() {
  return (
    <OperationsPage title="Categorías de gastos de taller" roles={["ADMIN"]}>
      {({ user }) => <ExpenseCategories userId={user.id} />}
    </OperationsPage>
  );
}
