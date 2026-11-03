import type { Branch, Coordinate } from "./branch";
import type { BusListRecord, DriverListRecord, BusType } from "./fleet";
export type TripStatus = "SCHEDULED" | "CANCELLING" | "CANCELLED" | "IN_TRANSIT" | "COMPLETED";
export interface RegularRouteInput {
  originBranchId: number;
  destinationBranchId: number;
  distanceKm: number;
  ticketPrice: number;
}
export interface RegularRoute extends RegularRouteInput {
  routeId: number;
}
export interface TripScheduleInput {
  routeId: number;
  busId: number;
  driverId: number;
  scheduledDepartureAt: string;
  scheduledArrivalAt: string;
  driverBaseSalary?: number | undefined;
}
export interface TripDeparture {
  actualDepartureAt: string;
  startKm: number;
}
export interface TripArrival {
  actualArrivalAt: string;
  endKm: number;
  fuelCost: number;
}
export interface TripDriverUpdate {
  driverId: number;
  driverBaseSalary?: number | undefined;
}
export interface TripCancellationInput {
  reason: string;
}
export interface TripCancellationResult {
  tripId: number;
  status: "CANCELLING" | "CANCELLED";
}
export interface TripRecord {
  tripId: number;
  tripType: "REGULAR" | "PRIVATE";
  status: TripStatus;
  route: RegularRoute | null;
  operatingBranchId: number | null;
  rentalId?: number | null | undefined;
  busId: number | null;
  driverId: number | null;
  scheduledDepartureAt: string;
  scheduledArrivalAt: string;
  price: number | null;
  driverBaseSalarySnapshot?: number | null | undefined;
  departure: TripDeparture | null;
  arrival: TripArrival | null;
}
export interface TripOffer {
  tripId: number;
  routeId: number;
  originBranchId: number;
  destinationBranchId: number;
  busId: number;
  departureAt: string;
  price: number;
  seatsAvailable: number | null;
}
export interface JourneyWorkspace {
  branchId: number;
  branches: Branch[];
  routes: RegularRoute[];
  buses: BusListRecord[];
  drivers: DriverListRecord[];
  busTypes: BusType[];
}
export interface RouteSegment {
  origin: Coordinate;
  destination: Coordinate;
  label: string;
}
