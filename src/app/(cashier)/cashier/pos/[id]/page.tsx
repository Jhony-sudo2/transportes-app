import { notFound } from "next/navigation";
import { OperationsPage } from "@/components/domain/OperationsPage";
import { SeatCheckout } from "@/components/domain/SeatCheckout";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = ManagedBranchIdSchema.safeParse(Number((await params).id));
  if (!id.success) notFound();
  return (
    <OperationsPage title="Cobro presencial de boletos" roles={["CAJERO"]}>
      {({ user }) => <SeatCheckout tripId={id.data} userId={user.id} counter />}
    </OperationsPage>
  );
}
