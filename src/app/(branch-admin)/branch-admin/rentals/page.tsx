import { OperationsPage } from "@/components/domain/OperationsPage";
import { RentalWorkspace } from "@/components/domain/RentalWorkspace";
export default function Page() {
  return (
    <OperationsPage
      title="Cotizaciones y alquileres privados"
      roles={["SUCURSAL_ADMIN"]}
      branchScope
    >
      {({ user, branchId }) => (
        <RentalWorkspace
          userId={user.id}
          role={user.role.name}
          {...(branchId ? { branchId } : {})}
          contractBase="/branch-admin/rentals"
        />
      )}
    </OperationsPage>
  );
}
