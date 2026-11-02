import { OperationsPage } from "@/components/domain/OperationsPage";
import { JourneyOffersClient } from "@/components/domain/JourneyOffersClient";
export default function Page() {
  return (
    <OperationsPage title="Venta presencial de boletos" roles={["SUCURSAL_ADMIN"]} branchScope>
      {() => <JourneyOffersClient checkoutBase="/branch-admin/pos" />}
    </OperationsPage>
  );
}
