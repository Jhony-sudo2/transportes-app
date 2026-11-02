import { notFound } from "next/navigation";
import { OperationsPage } from "@/components/domain/OperationsPage";
import { RentalContractView } from "@/components/domain/RentalWorkspace";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = ManagedBranchIdSchema.safeParse(Number((await params).id));
  if (!id.success) notFound();
  return (
    <OperationsPage title="Contratación privada y tramos" roles={["SUCURSAL_ADMIN"]} branchScope>
      {({ user, branchId }) => (
        <RentalContractView
          rentalId={id.data}
          userId={user.id}
          role={user.role.name}
          {...(branchId ? { branchId } : {})}
        />
      )}
    </OperationsPage>
  );
}
