import { z } from "zod";
import type {
  RegularRoute,
  RegularRouteInput,
  TripRecord,
  TripScheduleInput,
  TripOffer,
  JourneyWorkspace,
  TripDriverUpdate,
  TripCancellationInput,
  TripCancellationResult,
} from "@/types/journey";
import { ManagedBranchIdSchema as id } from "./branch-context";
import { BranchListSchema } from "./branch";
import { BusListSchema, DriverListSchema } from "./fleet-resources";
import { BusTypeListSchema } from "./bus-type";
export const CivilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Fecha no válida");
export const BusinessInstantSchema = z.string().datetime({ offset: true });
export const MoneyInputSchema = z
  .number()
  .finite()
  .nonnegative()
  .max(999999999999.99)
  .refine((value) => Number(value.toFixed(2)) === value, "Usa como máximo dos decimales");
export const RegularRouteInputSchema = z
  .object({
    originBranchId: id,
    destinationBranchId: id,
    distanceKm: z
      .number()
      .finite()
      .positive()
      .max(99999999.99)
      .refine(
        (value) => Number(value.toFixed(2)) === value,
        "Usa como máximo dos decimales en la distancia",
      ),
    ticketPrice: MoneyInputSchema.refine((value) => value > 0, "La tarifa debe ser positiva"),
  })
  .strict() satisfies z.ZodType<RegularRouteInput, z.ZodTypeDef, unknown>;
export const RegularRouteSchema = RegularRouteInputSchema.extend({
  routeId: id,
}).strip() satisfies z.ZodType<RegularRoute, z.ZodTypeDef, unknown>;
export const RouteListSchema = z.array(RegularRouteSchema);
export const TripScheduleInputSchema = z
  .object({
    routeId: id,
    busId: id,
    driverId: id,
    scheduledDepartureAt: BusinessInstantSchema,
    scheduledArrivalAt: BusinessInstantSchema,
    driverBaseSalary: MoneyInputSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Date.parse(value.scheduledArrivalAt) > Date.parse(value.scheduledDepartureAt),
    { path: ["scheduledArrivalAt"], message: "La llegada prevista debe ser posterior a la salida" },
  ) satisfies z.ZodType<TripScheduleInput, z.ZodTypeDef, unknown>;
export const TripDepartureSchema = z
  .object({
    actualDepartureAt: BusinessInstantSchema,
    startKm: z.number().int().nonnegative().safe(),
  })
  .strict();
export const TripArrivalSchema = z
  .object({
    actualArrivalAt: BusinessInstantSchema,
    endKm: z.number().int().nonnegative().safe(),
    fuelCost: MoneyInputSchema,
  })
  .strict();
export const TripStatusSchema = z.enum([
  "SCHEDULED",
  "CANCELLING",
  "CANCELLED",
  "IN_TRANSIT",
  "COMPLETED",
]);
export const TripRecordSchema = z
  .object({
    tripId: id,
    tripType: z.enum(["REGULAR", "PRIVATE"]),
    status: TripStatusSchema,
    route: RegularRouteSchema.nullable(),
    operatingBranchId: id.nullable(),
    rentalId: id.nullish(),
    busId: id.nullable(),
    driverId: id.nullable(),
    scheduledDepartureAt: BusinessInstantSchema,
    scheduledArrivalAt: BusinessInstantSchema,
    price: MoneyInputSchema.nullable(),
    driverBaseSalarySnapshot: MoneyInputSchema.nullish(),
    departure: TripDepartureSchema.strip().nullable(),
    arrival: TripArrivalSchema.strip().nullable(),
  })
  .superRefine((trip, context) => {
    if (
      (trip.tripType === "REGULAR" &&
        (!trip.route || trip.price === null || !trip.operatingBranchId || trip.rentalId != null)) ||
      (trip.tripType === "PRIVATE" && (!trip.rentalId || trip.route || trip.price !== null))
    )
      context.addIssue({ code: "custom", message: "Tipo y referencias del viaje incompatibles" });
    if (
      (trip.status === "SCHEDULED" ||
        trip.status === "CANCELLING" ||
        trip.status === "CANCELLED") &&
      (trip.departure || trip.arrival)
    )
      context.addIssue({ code: "custom", message: "El estado del viaje contradice su ejecución" });
    if (
      (trip.status === "IN_TRANSIT" || trip.status === "COMPLETED") &&
      (!trip.departure || !trip.busId || !trip.driverId)
    )
      context.addIssue({ code: "custom", message: "Falta la salida o los recursos del viaje" });
    if (trip.status === "COMPLETED" && !trip.arrival)
      context.addIssue({ code: "custom", message: "Falta la llegada del viaje completado" });
    if (trip.status === "IN_TRANSIT" && trip.arrival)
      context.addIssue({ code: "custom", message: "Un viaje con llegada debe estar finalizado" });
    if (Date.parse(trip.scheduledArrivalAt) <= Date.parse(trip.scheduledDepartureAt))
      context.addIssue({ code: "custom", message: "Horario previsto incompatible" });
    if (
      trip.arrival &&
      (!trip.departure ||
        trip.arrival.endKm < trip.departure.startKm ||
        Date.parse(trip.arrival.actualArrivalAt) < Date.parse(trip.departure.actualDepartureAt))
    )
      context.addIssue({ code: "custom", message: "Llegada incompatible con salida" });
  }) satisfies z.ZodType<TripRecord, z.ZodTypeDef, unknown>;
export const TripListSchema = z.array(TripRecordSchema);
export const TripOfferSchema = z.object({
  tripId: id,
  routeId: id,
  busId: id,
  departureAt: BusinessInstantSchema,
  price: MoneyInputSchema,
  seatsAvailable: z.number().int().nonnegative().safe(),
}) satisfies z.ZodType<TripOffer, z.ZodTypeDef, unknown>;
export const TripOffersSchema = z.array(TripOfferSchema);
export const TripDriverUpdateSchema = z
  .object({ driverId: id, driverBaseSalary: MoneyInputSchema.optional() })
  .strict() satisfies z.ZodType<TripDriverUpdate, z.ZodTypeDef, unknown>;
export const TripCancellationSchema = z
  .object({ reason: z.string().trim().min(1, "Indica el motivo de la cancelación").max(500) })
  .strict() satisfies z.ZodType<TripCancellationInput, z.ZodTypeDef, unknown>;
export const TripCancellationResultSchema = z.object({
  tripId: id,
  status: z.enum(["CANCELLING", "CANCELLED"]),
}) satisfies z.ZodType<TripCancellationResult, z.ZodTypeDef, unknown>;
export const JourneyWorkspaceSchema = z.object({
  branchId: id,
  branches: BranchListSchema,
  routes: RouteListSchema,
  buses: BusListSchema,
  drivers: DriverListSchema,
  busTypes: BusTypeListSchema,
}) satisfies z.ZodType<JourneyWorkspace, z.ZodTypeDef, unknown>;
