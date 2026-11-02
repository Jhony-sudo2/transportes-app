import { OperationsPage } from "@/components/domain/OperationsPage";
import { SeatRestrictions } from "@/components/domain/SeatRestrictions";
export default function Page() {
  return (
    <OperationsPage title="Bloqueos de asientos por viaje" roles={["CAJERO"]}>
      {({ user }) => <SeatRestrictions userId={user.id} />}
    </OperationsPage>
  );
}
