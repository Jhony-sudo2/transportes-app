import type { TripRecord } from "./journey";
import type { CancellationPreview } from "./commerce";
import type { Branch } from "./branch";
import type { BusType, BusListRecord, DriverListRecord } from "./fleet";
export interface RentalContext {
  busTypes: BusType[];
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
  customerId: number;
  status: "PENDING_APPROVAL" | "APPROVED" | "PAID";
  expiresAt: string;
  finalPrice: number | null;
  managingBranchId: number | null;
  rentalId: number | null;
  invoiceId: number | null;
  estimatedCost?: number | null | undefined;
  priceComponents?: QuotePriceComponent[] | undefined;
  customerNit?: string | undefined;
}
export interface RentalLeg extends TripRecord {
  legType: "OUTBOUND" | "RETURN";
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
