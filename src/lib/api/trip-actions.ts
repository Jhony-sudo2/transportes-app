import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  branchJourneyAccess,
  branchTrip,
  driverJourneyAccess,
  driverTrip,
  confirmedTrip,
} from "./journey";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "./transport-service";
import {
  TripDepartureSchema,
  TripArrivalSchema,
  TripDriverUpdateSchema,
  TripCancellationSchema,
  TripCancellationResultSchema,
} from "@/lib/validators/journey";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { DriverListSchema } from "@/lib/validators/fleet-resources";
import { driverAvailability } from "@/lib/fleet-availability";
import { ApplicationError } from "@/types/error";
import { adminErrorResponse } from "./admin";
import type { TripRecord } from "@/types/journey";

function sameTripAssignment(before: TripRecord, after: TripRecord) {
  return (
    before.tripType === after.tripType &&
    before.operatingBranchId === after.operatingBranchId &&
    (before.rentalId ?? null) === (after.rentalId ?? null) &&
    before.route?.routeId === after.route?.routeId &&
    before.driverId === after.driverId &&
    before.busId === after.busId &&
    before.price === after.price
  );
}
type Context = { params: Promise<{ id: string; action: string }> };
export async function tripAction(
  request: NextRequest,
  context: Context,
  actor: "branch" | "driver",
) {
  try {
    requireSameOrigin(request);
    const access =
      actor === "branch"
        ? await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")))
        : await driverJourneyAccess();
    const params = await context.params;
    const id = checkedBody(ManagedBranchIdSchema, Number(params.id));
    if (
      !["departure", "arrival", ...(actor === "branch" ? ["cancel", "driver"] : [])].includes(
        params.action,
      )
    )
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "No tienes permiso para esta operación sobre el viaje.",
      );
    const trip =
      actor === "branch" && "branchId" in access
        ? await branchTrip(id, access)
        : "driverId" in access
          ? await driverTrip(id, access)
          : null;
    if (!trip) throw new ApplicationError("auth.forbidden", 403, "No se pudo verificar el viaje.");
    const raw: unknown = await request.json().catch(() => null);
    if (params.action === "cancel") {
      if (trip.status !== "SCHEDULED" || trip.departure)
        throw new ApplicationError(
          "resource.conflict",
          409,
          "Solo se puede cancelar un viaje que todavía no inició.",
        );
      const input = checkedBody(TripCancellationSchema, raw);
      const result = serviceResult(
        TripCancellationResultSchema,
        await transportService(`trips/${id}/cancel`, { ...access, body: input }),
      );
      if (result.tripId !== id)
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se pudo confirmar la referencia de cancelación.",
        );
      return NextResponse.json(result, { status: result.status === "CANCELLING" ? 202 : 200 });
    }
    if (params.action === "driver") {
      if (trip.status !== "SCHEDULED" || trip.departure || !("branchId" in access))
        throw new ApplicationError(
          "resource.conflict",
          409,
          "Solo se puede reasignar chofer antes de iniciar el viaje.",
        );
      const input = checkedBody(TripDriverUpdateSchema, raw);
      const drivers = serviceResult(
        DriverListSchema,
        await transportService(`branches/${access.branchId}/drivers`, access),
      );
      const driver = drivers.find((item) => item.id === input.driverId);
      if (!driver || driverAvailability(driver).active !== true)
        throw new ApplicationError(
          "domain.invariant_violated",
          422,
          "El chofer no está habilitado en esta sucursal.",
        );
      const updated = await confirmedTrip(
        await transportService(`trips/${id}`, { ...access, method: "PATCH", body: input }),
        access,
        id,
      );
      if (
        updated.tripId !== id ||
        updated.driverId !== input.driverId ||
        updated.busId !== trip.busId ||
        updated.tripType !== trip.tripType ||
        updated.price !== trip.price ||
        updated.route?.routeId !== trip.route?.routeId ||
        updated.route?.destinationBranchId !== trip.route?.destinationBranchId ||
        updated.route?.distanceKm !== trip.route?.distanceKm ||
        updated.route?.ticketPrice !== trip.route?.ticketPrice ||
        updated.operatingBranchId !== trip.operatingBranchId ||
        updated.route?.originBranchId !== trip.route?.originBranchId ||
        Date.parse(updated.scheduledDepartureAt) !== Date.parse(trip.scheduledDepartureAt) ||
        Date.parse(updated.scheduledArrivalAt) !== Date.parse(trip.scheduledArrivalAt) ||
        updated.status !== "SCHEDULED" ||
        (input.driverBaseSalary !== undefined &&
          updated.driverBaseSalarySnapshot !== input.driverBaseSalary)
      )
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se pudo verificar la reasignación. Actualiza el viaje antes de repetirla.",
        );
      return NextResponse.json(updated);
    }
    if (params.action === "departure") {
      if (trip.status !== "SCHEDULED" || trip.departure || !trip.busId || !trip.driverId)
        throw new ApplicationError(
          "resource.conflict",
          409,
          "El viaje no puede iniciar en su estado actual.",
        );
      const input = checkedBody(TripDepartureSchema, raw);
      const result = await confirmedTrip(
        await transportService(`trips/${id}/departure`, { ...access, body: input }),
        access,
        id,
      );
      if (
        result.tripId !== id ||
        result.status !== "IN_TRANSIT" ||
        !sameTripAssignment(trip, result) ||
        result.driverId !== trip.driverId ||
        result.busId !== trip.busId ||
        result.departure?.startKm !== input.startKm ||
        Date.parse(result.departure.actualDepartureAt) !== Date.parse(input.actualDepartureAt)
      )
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se pudo confirmar la salida. Consulta el viaje antes de volver a enviarla.",
        );
      return NextResponse.json(result);
    }
    if (trip.status !== "IN_TRANSIT" || !trip.departure || trip.arrival)
      throw new ApplicationError(
        "resource.conflict",
        409,
        "Solo se puede finalizar un viaje en tránsito.",
      );
    const input = checkedBody(TripArrivalSchema, raw);
    if (
      input.endKm < trip.departure.startKm ||
      Date.parse(input.actualArrivalAt) < Date.parse(trip.departure.actualDepartureAt)
    )
      throw new ApplicationError(
        "validation.failed",
        400,
        "La fecha de llegada y el kilometraje final deben ser coherentes con la salida.",
      );
    const result = await confirmedTrip(
      await transportService(`trips/${id}/arrival`, { ...access, body: input }),
      access,
      id,
    );
    if (
      result.tripId !== id ||
      result.status !== "COMPLETED" ||
      !sameTripAssignment(trip, result) ||
      result.driverId !== trip.driverId ||
      result.busId !== trip.busId ||
      result.departure?.startKm !== trip.departure.startKm ||
      Date.parse(result.departure.actualDepartureAt) !==
        Date.parse(trip.departure.actualDepartureAt) ||
      result.arrival?.endKm !== input.endKm ||
      result.arrival.fuelCost !== input.fuelCost ||
      Date.parse(result.arrival.actualArrivalAt) !== Date.parse(input.actualArrivalAt)
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar la llegada. Consulta el viaje antes de volver a enviarla.",
      );
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
