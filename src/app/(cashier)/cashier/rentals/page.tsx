import { OperationsPage } from "@/components/domain/OperationsPage";
import { RentalWorkspace } from "@/components/domain/RentalWorkspace";
export default function Page() {
  return (
    <OperationsPage title="Cobrar cotizaciones aprobadas" roles={["CAJERO"]}>
      {({ user, branchId }) => (
        <RentalWorkspace
          userId={user.id}
          role={user.role.name}
          {...(branchId ? { branchId } : {})}
          contractBase="/cashier/rentals"
        />
      )}
    </OperationsPage>
  );
}
