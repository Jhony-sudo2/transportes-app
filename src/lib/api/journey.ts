import "server-only";
import { z } from "zod";
import { requireSelectedBranch } from "./branch-workspace";
import { requireAccountAccess, getOwnDriver } from "./account";
import { transportService, serviceResult } from "./transport-service";
import {
  RouteListSchema,
  TripRecordSchema,
  TripListSchema,
  TripStatusSchema,
} from "@/lib/validators/journey";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";
import { BranchListSchema, getBranchCoordinate } from "@/lib/validators/branch";
export async function branchJourneyAccess(branchId: number) {
  return requireSelectedBranch(branchId);
}
export async function branchRoutes(access: Awaited<ReturnType<typeof branchJourneyAccess>>) {
  const routes = serviceResult(
    RouteListSchema,
    await transportService(`routes?originBranchId=${access.branchId}`, access),
  );
  if (routes.some((route) => route.originBranchId !== access.branchId))
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "El listado contiene rutas de otra sucursal.",
    );
  return routes;
}
export async function ownRoute(
  id: number,
  access: Awaited<ReturnType<typeof branchJourneyAccess>>,
) {
  const route = (await branchRoutes(access)).find((item) => item.routeId === id);
  if (!route)
    throw new ApplicationError(
      "resource.not_found",
      404,
      "No se encontró la ruta en la sucursal seleccionada.",
    );
  return route;
}
export async function routeBranches(originId: number, destinationId: number, token: string) {
  if (originId === destinationId)
    throw new ApplicationError("validation.failed", 400, "Origen y destino deben ser diferentes.");
  const branches = serviceResult(BranchListSchema, await transportService("branches", { token }));
  for (const id of [originId, destinationId]) {
    const branch = branches.find((item) => item.id === id);
    if (!branch || branch.active !== true || !getBranchCoordinate(branch))
      throw new ApplicationError(
        "domain.invariant_violated",
        422,
        "Las sucursales de origen y destino deben estar habilitadas y tener coordenadas válidas.",
      );
  }
  return branches;
}
export async function branchTrip(
  id: number,
  access: Awaited<ReturnType<typeof branchJourneyAccess>>,
) {
  const trip = serviceResult(TripRecordSchema, await transportService(`trips/${id}`, access));
  if (trip.tripId !== id)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "El servicio no devolvió el viaje solicitado.",
    );
  if (
    trip.tripType !== "REGULAR" ||
    trip.route?.originBranchId !== access.branchId ||
    trip.operatingBranchId !== access.branchId
  )
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "El viaje no pertenece a la sucursal seleccionada.",
    );
  return trip;
}
export async function driverJourneyAccess() {
  const access = await requireAccountAccess();
  if (access.user.role.name !== "DRIVER")
    throw new ApplicationError("auth.forbidden", 403, "Se requiere una cuenta de conductor.");
  const driver = await getOwnDriver(access);
  return { ...access, driverId: driver.id };
}
export async function driverTrips(access: Awaited<ReturnType<typeof driverJourneyAccess>>) {
  const trips = serviceResult(
    TripListSchema,
    await transportService(`trips?driverId=${access.driverId}`, access),
  );
  if (trips.some((trip) => trip.driverId !== access.driverId))
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "No se pueden consultar viajes de otro conductor.",
    );
  return trips;
}
export async function driverTrip(
  id: number,
  access: Awaited<ReturnType<typeof driverJourneyAccess>>,
) {
  const trip = serviceResult(TripRecordSchema, await transportService(`trips/${id}`, access));
  if (trip.tripId !== id)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "El viaje recibido no corresponde a la solicitud.",
    );
  if (trip.driverId !== access.driverId)
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "El viaje no está asignado a tu cuenta de conductor.",
    );
  return trip;
}

const mutationReferenceSchema = z.object({
  tripId: ManagedBranchIdSchema,
  status: TripStatusSchema,
});
// Los comandos del SSOT pueden devolver solo referencia y estado. Se consulta el
// detalle persistido cuando hace falta, sin reconstruir el resultado con el request.
export async function confirmedTrip(raw: unknown, access: { token: string }, expectedId?: number) {
  const reference = serviceResult(mutationReferenceSchema, raw);
  if (expectedId !== undefined && reference.tripId !== expectedId)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "La respuesta no corresponde al viaje solicitado. Consulta su estado.",
    );
  const complete = TripRecordSchema.safeParse(raw);
  if (complete.success) return complete.data;
  try {
    const trip = serviceResult(
      TripRecordSchema,
      await transportService(`trips/${reference.tripId}`, access),
    );
    if (trip.tripId !== reference.tripId) throw new Error("Referencia incompatible");
    return trip;
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      "La solicitud fue enviada, pero no se pudo verificar el viaje actualizado. Consulta su estado antes de repetirla.",
    );
  }
}
