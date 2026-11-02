import { notFound } from "next/navigation";
import { OperationsPage } from "@/components/domain/OperationsPage";
import { CommerceReceipt } from "@/components/domain/CommerceReceipt";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = ManagedBranchIdSchema.safeParse(Number((await params).id));
  if (!id.success) notFound();
  return (
    <OperationsPage
      title="Comprobante de compra"
      roles={["ADMIN", "CUSTOMER", "CAJERO", "SUCURSAL_ADMIN"]}
      branchScope
    >
      {({ user, branchId }) => (
        <CommerceReceipt
          invoiceId={id.data}
          userId={user.id}
          role={user.role.name}
          {...(branchId ? { branchId } : {})}
        />
      )}
    </OperationsPage>
  );
}
