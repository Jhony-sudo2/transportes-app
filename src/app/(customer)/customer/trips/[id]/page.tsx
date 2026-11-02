import { notFound } from "next/navigation";
import { OperationsPage } from "@/components/domain/OperationsPage";
import { SeatCheckout } from "@/components/domain/SeatCheckout";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = ManagedBranchIdSchema.safeParse(Number((await params).id));
  if (!id.success) notFound();
  return (
    <OperationsPage title="Elige tus asientos" roles={["CUSTOMER"]}>
      {({ user }) => <SeatCheckout tripId={id.data} userId={user.id} />}
    </OperationsPage>
  );
}
