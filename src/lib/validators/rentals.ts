import { z } from "zod";
import type * as R from "@/types/rentals";
import { ManagedBranchIdSchema as id } from "./branch-context";
import {
  MoneyInputSchema as money,
  BusinessInstantSchema as instant,
  TripRecordSchema,
} from "./journey";
import { CivilDateSchema } from "./journey";
import { CancellationPreviewSchema } from "./commerce";
import { BusTypeListSchema } from "./bus-type";
import { BranchListSchema } from "./branch";
import { BusListSchema, DriverListSchema } from "./fleet-resources";
export const RentalContextSchema = z.object({
  busTypes: BusTypeListSchema,
  branches: BranchListSchema,
  branchId: id.nullable(),
}) satisfies z.ZodType<R.RentalContext, z.ZodTypeDef, unknown>;
export const RentalResourcesSchema = z.object({
  branchId: id,
  buses: BusListSchema,
  drivers: DriverListSchema,
}) satisfies z.ZodType<R.RentalResources, z.ZodTypeDef, unknown>;
export const RentalQuoteInputSchema = z
  .object({
    origin: z.string().trim().min(1).max(255),
    destination: z.string().trim().min(1).max(255),
    departureAt: instant,
    returnDepartureAt: instant.optional(),
    passengerCount: id,
    busTypeId: id,
    waitHours: money.refine((n) => n <= 999999.99),
  })
  .strict();
export const CheckedRentalQuoteInputSchema = RentalQuoteInputSchema.refine(
  (v) =>
    v.origin !== v.destination &&
    (!v.returnDepartureAt || Date.parse(v.returnDepartureAt) > Date.parse(v.departureAt)),
  "Revisa origen, destino y horario de retorno",
) satisfies z.ZodType<R.RentalQuoteInput, z.ZodTypeDef, unknown>;
export const PriceComponentSchema = z
  .object({ description: z.string().trim().min(1).max(500), amount: money })
  .strict();
export const QuoteApprovalSchema = z
  .object({
    managingBranchId: id,
    estimatedOutboundKm: money.refine((n) => n > 0),
    estimatedReturnKm: money.refine((n) => n > 0).optional(),
    outboundArrivalEstimateAt: instant,
    returnArrivalEstimateAt: instant.optional(),
    driverBaseSalary: money.optional(),
    priceComponents: z.array(PriceComponentSchema).max(100),
    finalPrice: money.refine((n) => n > 0),
  })
  .strict();
export const AdminQuoteInputSchema = RentalQuoteInputSchema.merge(QuoteApprovalSchema)
  .extend({
    nit: z.string().trim().min(1).max(50),
    contactEmail: z.string().email().max(254).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.origin !== v.destination &&
      Date.parse(v.outboundArrivalEstimateAt) > Date.parse(v.departureAt) &&
      (!v.returnDepartureAt ||
        (!!v.estimatedReturnKm &&
          !!v.returnArrivalEstimateAt &&
          Date.parse(v.returnDepartureAt) > Date.parse(v.outboundArrivalEstimateAt) &&
          Date.parse(v.returnArrivalEstimateAt) > Date.parse(v.returnDepartureAt))),
    "Completa kilómetros y horarios coherentes de cada tramo",
  );
export const RentalQuoteSchema = RentalQuoteInputSchema.extend({
  quoteId: id,
  customerId: id,
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "PAID"]),
  expiresAt: instant,
  finalPrice: money.nullable(),
  managingBranchId: id.nullable(),
  rentalId: id.nullable(),
  invoiceId: id.nullable(),
  estimatedCost: money.nullish(),
  priceComponents: z.array(PriceComponentSchema).optional(),
  customerNit: z.string().optional(),
})
  .strip()
  .superRefine((q, c) => {
    if (
      q.status !== "PENDING_APPROVAL" &&
      (!q.managingBranchId || q.finalPrice === null || q.finalPrice <= 0)
    )
      c.addIssue({ code: "custom", message: "Cotización aprobada incompleta" });
    if (q.status === "PAID" && !q.invoiceId)
      c.addIssue({ code: "custom", message: "Falta la referencia del pago" });
  }) satisfies z.ZodType<R.RentalQuote, z.ZodTypeDef, unknown>;
export const RentalLegSchema = TripRecordSchema.and(
  z.object({ legType: z.enum(["OUTBOUND", "RETURN"]) }),
);
export const RentalContractSchema = z
  .object({
    rentalId: id,
    quoteId: id,
    invoiceId: id,
    customerId: id,
    managingBranchId: id,
    status: z.enum(["PAID", "CANCELLING", "CANCELLED", "COMPLETED"]),
    legs: z.array(RentalLegSchema).min(1).max(2),
    cancelledAt: instant.nullish(),
    cancellationPreview: z
      .object({
        VOLUNTARY: CancellationPreviewSchema,
        BUSINESS_INCIDENT: CancellationPreviewSchema,
      })
      .optional(),
  })
  .superRefine((r, c) => {
    if (
      !r.legs.some((l) => l.legType === "OUTBOUND") ||
      new Set(r.legs.map((l) => l.legType)).size !== r.legs.length ||
      r.legs.some((l) => l.rentalId !== r.rentalId || l.tripType !== "PRIVATE") ||
      (r.status === "COMPLETED" && r.legs.some((l) => l.status !== "COMPLETED"))
    )
      c.addIssue({ code: "custom", message: "Tramos incompatibles con el alquiler" });
  }) satisfies z.ZodType<R.RentalContract, z.ZodTypeDef, unknown>;
const resources = z
  .object({ busId: id, driverId: id, driverBaseSalary: money.optional() })
  .strict();
export const RentalAssignSchema = z
  .object({ outbound: resources, return: resources.optional() })
  .strict();
export const RentalCancelSchema = z
  .object({
    cause: z.enum(["VOLUNTARY", "BUSINESS_INCIDENT"]),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export const RentalCancelResultSchema = z.object({
  rentalId: id,
  status: z.enum(["CANCELLING", "CANCELLED"]),
});
export const RentalPolicySchema = z
  .object({ validityDays: id, waitCostPerHour: money })
  .strict() satisfies z.ZodType<R.RentalPolicy, z.ZodTypeDef, unknown>;
export const RentalPaymentInputSchema = z
  .object({
    quoteId: id,
    paymentDate: CivilDateSchema,
    contactEmail: z.string().email().max(254).optional(),
  })
  .strict();
export const RentalPaymentSchema = z.object({
  invoiceId: id,
  quoteId: id,
  paymentStatus: z.literal("PAID"),
  sourceBranchId: id.optional(),
  revenueBranchId: id.optional(),
  rentalId: id.nullish(),
}) satisfies z.ZodType<R.RentalPayment, z.ZodTypeDef, unknown>;
