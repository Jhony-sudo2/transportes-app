import { OperationsPage } from "@/components/domain/OperationsPage";
import { JourneyOffersClient } from "@/components/domain/JourneyOffersClient";
export default function Page() {
  return (
    <OperationsPage title="Venta presencial de boletos" roles={["CAJERO"]}>
      {() => <JourneyOffersClient checkoutBase="/cashier/pos" />}
    </OperationsPage>
  );
}
