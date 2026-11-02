export interface BusFormData {
  branchId: number;
  plateNumber: string;
  brand: string;
  color: string;
  model: string;
  year_manufacture: number;
  seatRows: number;
  seatColumns: number;
  currentKm: number;
  busTypeId: number;
  rentalEnabled: boolean;
  stateId?: number | undefined;
}
export interface CreatedBus {
  id: number;
  plateNumber: string;
  brand: string;
  model: string;
  yearManufacture: number;
  capacity: number;
  currentKm: number;
  seatRows: number;
  seatColumns: number;
  state: string;
  photo?: string | null | undefined;
  color?: string | null | undefined;
  busTypeId?: number | null | undefined;
  rentalEnabled?: boolean | undefined;
}
export interface BusListRecord
  extends Omit<
    CreatedBus,
    "yearManufacture" | "capacity" | "currentKm" | "seatRows" | "seatColumns" | "state"
  > {
  yearManufacture?: number | null | undefined;
  capacity?: number | null | undefined;
  currentKm?: number | null | undefined;
  seatRows?: number | null | undefined;
  seatColumns?: number | null | undefined;
  state?: string | null | undefined;
}
export type DriverStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "ACCOUNT_REJECTED";
export interface DriverLicense {
  number: string;
  expirationDate: string;
  licenseType: number;
}
export interface DriverFormData {
  branchId: number;
  name: string;
  lastName: string;
  dpi: string;
  nit: string;
  phone: string;
  email: string;
  adress: string;
  baseSalary: number;
  license: DriverLicense;
}
export interface CreatedDriver {
  id: number;
  name: string;
  lastName: string;
  email: string;
  status: DriverStatus;
  pendingOperationId?: string | null | undefined;
  failureReason?: string | null | undefined;
}
export interface DriverListRecord extends Omit<CreatedDriver, "email" | "status"> {
  userId?: number | null | undefined;
  email?: string | null | undefined;
  status?: DriverStatus | null | undefined;
  phone?: string | null | undefined;
  baseSalary?: number | null | undefined;
  number?: string | null | undefined;
  expirationDate?: string | null | undefined;
  licenseTypeName?: string | null | undefined;
  licenseId?: number | null | undefined;
  licenseTypeId?: number | null | undefined;
  active?: boolean | undefined;
}
export interface DriverOperationReference {
  driverId: number;
  operationId: string;
  branchId: number;
}
export interface DriverOperation {
  operationId: string;
  driverId: number;
  action: "CREATE";
  status: "PENDING" | "COMPLETED" | "REJECTED";
  failureReason?: string | null | undefined;
}
export interface BusTypeInput {
  name: string;
  description?: string | undefined;
  capacity: number;
  fuelEstimatePerKm: number;
  depreciationPerKm: number;
  suggestedDriverSalaryPerTrip: number;
  active: boolean;
}
export interface BusType extends Omit<BusTypeInput, "description"> {
  id: number;
  description?: string | null | undefined;
}
export interface BusState {
  id: number;
  name: string;
}
export interface DriverLicenseContext {
  branchId: number;
  license: DriverLicense;
  types: { id: number; name: string }[];
}
