import { OperationsPage } from "@/components/domain/OperationsPage";
import { CancellationPolicy } from "@/components/domain/CancellationPolicy";
export default function Page() {
  return (
    <OperationsPage title="Política global de cancelaciones" roles={["ADMIN"]}>
      {({ user }) => <CancellationPolicy userId={user.id} />}
    </OperationsPage>
  );
}
