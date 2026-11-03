import type { TripRecord, TripDeparture, TripArrival } from "./journey";
import type { CancellationPreview } from "./commerce";
import type { Branch } from "./branch";
import type { BusListRecord, DriverListRecord } from "./fleet";
export interface RentalBusType {
  id: number;
  name: string;
  capacity: number;
  description?: string | null | undefined;
  active?: boolean | undefined;
  suggestedDriverSalaryPerTrip?: number | undefined;
  availabilityHint?: "POSSIBLE" | "NONE" | "UNKNOWN" | undefined;
}
export interface RentalContext {
  busTypes: RentalBusType[];
  branches: Branch[];
  branchId: number | null;
}
export interface RentalResources {
  branchId: number;
  buses: BusListRecord[];
  drivers: DriverListRecord[];
}
export interface RentalResourceSelection {
  busId: number;
  driverId: number;
  driverBaseSalary?: number | undefined;
}
export interface RentalQuoteInput {
  origin: string;
  destination: string;
  departureAt: string;
  returnDepartureAt?: string | undefined;
  passengerCount: number;
  busTypeId: number;
  waitHours: number;
}
export interface QuotePriceComponent {
  description: string;
  amount: number;
}
export interface RentalQuote extends RentalQuoteInput {
  quoteId: number;
  quoteReference?: string | undefined;
  customerId?: number | undefined;
  status: "PENDING_APPROVAL" | "APPROVED" | "PAID";
  expiresAt: string;
  finalPrice: number | null;
  managingBranchId?: number | null | undefined;
  rentalId: number | null;
  invoiceId?: number | null | undefined;
  estimatedCost?: number | null | undefined;
  priceComponents?: QuotePriceComponent[] | undefined;
  customerNit?: string | undefined;
}
export interface RentalLeg
  extends Pick<
    TripRecord,
    | "tripId"
    | "status"
    | "operatingBranchId"
    | "busId"
    | "driverId"
    | "scheduledDepartureAt"
    | "scheduledArrivalAt"
  > {
  legType: "OUTBOUND" | "RETURN";
  departure?: TripDeparture | null | undefined;
  arrival?: TripArrival | null | undefined;
  driverBaseSalarySnapshot?: number | null | undefined;
}
export interface RentalContract {
  cancellationPreview?:
    | { VOLUNTARY: CancellationPreview; BUSINESS_INCIDENT: CancellationPreview }
    | undefined;
  rentalId: number;
  quoteId: number;
  invoiceId: number;
  customerId: number;
  managingBranchId: number;
  status: "PAID" | "CANCELLING" | "CANCELLED" | "COMPLETED";
  legs: RentalLeg[];
  cancelledAt?: string | null | undefined;
}
export interface RentalPolicy {
  validityDays: number;
  waitCostPerHour: number;
}
export interface RentalPayment {
  invoiceId: number;
  quoteId: number;
  paymentStatus: "PAID";
  sourceBranchId?: number | undefined;
  revenueBranchId?: number | undefined;
  rentalId?: number | null | undefined;
}
export interface PayableQuote {
  quoteId: number;
  customerNit: string;
  finalPrice: number;
  expiresAt: string;
}
