import { OperationsPage } from "@/components/domain/OperationsPage";
import { RentalWorkspace } from "@/components/domain/RentalWorkspace";
export default function Page() {
  return (
    <OperationsPage title="Cotizaciones y alquileres privados" roles={["CUSTOMER"]}>
      {({ user, branchId }) => (
        <RentalWorkspace
          userId={user.id}
          role={user.role.name}
          {...(branchId ? { branchId } : {})}
          contractBase="/customer/rentals"
        />
      )}
    </OperationsPage>
  );
}
