import { NextRequest, NextResponse } from "next/server";
import {
  branchJourneyAccess,
  branchOperatingTrips,
  ownRoute,
  confirmedTrip,
} from "@/lib/api/journey";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "@/lib/api/transport-service";
import { TripScheduleInputSchema } from "@/lib/validators/journey";
import { BusListSchema, DriverListSchema } from "@/lib/validators/fleet-resources";
import { busAvailability, driverAvailability } from "@/lib/fleet-availability";
import { adminErrorResponse } from "@/lib/api/admin";
import { ApplicationError } from "@/types/error";
export async function GET(request: NextRequest) {
  try {
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    const trips = await branchOperatingTrips(access, "REGULAR");
    if (
      trips.some(
        (trip) =>
          trip.tripType !== "REGULAR" ||
          trip.route?.originBranchId !== access.branchId ||
          trip.operatingBranchId !== access.branchId,
      )
    )
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "No se pueden consultar viajes de otra sucursal.",
      );
    return NextResponse.json(trips);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    const input = checkedBody(TripScheduleInputSchema, await request.json().catch(() => null));
    await ownRoute(input.routeId, access);
    const [rawBuses, rawDrivers] = await Promise.all([
      transportService(`branches/${access.branchId}/buses`, access),
      transportService(`branches/${access.branchId}/drivers`, access),
    ]);
    const bus = serviceResult(BusListSchema, rawBuses).find((item) => item.id === input.busId);
    const driver = serviceResult(DriverListSchema, rawDrivers).find(
      (item) => item.id === input.driverId,
    );
    if (
      !bus ||
      !driver ||
      busAvailability(bus).active !== true ||
      driverAvailability(driver).active !== true
    )
      throw new ApplicationError(
        "domain.invariant_violated",
        422,
        "Selecciona un bus y un chofer habilitados de tu sucursal.",
      );
    const trip = await confirmedTrip(
      await transportService("trips", { ...access, body: input }),
      access,
    );
    if (
      trip.tripType !== "REGULAR" ||
      trip.status !== "SCHEDULED" ||
      trip.route?.routeId !== input.routeId ||
      trip.route.originBranchId !== access.branchId ||
      trip.operatingBranchId !== access.branchId ||
      trip.busId !== input.busId ||
      trip.driverId !== input.driverId ||
      (input.driverBaseSalary !== undefined &&
        trip.driverBaseSalarySnapshot !== input.driverBaseSalary) ||
      Date.parse(trip.scheduledDepartureAt) !== Date.parse(input.scheduledDepartureAt) ||
      Date.parse(trip.scheduledArrivalAt) !== Date.parse(input.scheduledArrivalAt)
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar la programación. Consulta los viajes antes de repetirla.",
      );
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
