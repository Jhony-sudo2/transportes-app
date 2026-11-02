import { z } from "zod";
import { ManagedBranchIdSchema as id } from "./branch-context";
import type { AnalyticsReport } from "@/types/analytics";
export const ReportKindSchema = z.enum([
  "income",
  "expenses",
  "profit",
  "routes-demand",
  "workshop-categories",
  "route-map",
  "fleet-operations",
  "branch-operations",
]);
export const DecimalStringSchema = z
  .string()
  .regex(/^-?\d+\.\d{2}(?:\d{2})?$/, "Los importes de Analytics deben ser cadenas decimales");
const text = z.string().nullish(),
  count = z.number().int().nonnegative().safe().nullish(),
  amount = DecimalStringSchema.nullish();
// Proyección explícita: no se entregan campos arbitrarios ni objetos de personas.
export const ReportRowSchema = z
  .object({
    documentRef: text,
    description: text,
    occurredAt: text,
    paymentDate: text,
    serviceDate: text,
    completedAt: text,
    channel: text,
    kind: text,
    branchId: id.nullish(),
    branchName: text,
    invoiceId: id.nullish(),
    tripId: id.nullish(),
    rentalId: id.nullish(),
    quoteId: id.nullish(),
    routeId: id.nullish(),
    busId: id.nullish(),
    driverId: id.nullish(),
    sellerUserId: id.nullish(),
    sellerName: text,
    ticketCount: count,
    customerName: text,
    brand: text,
    model: text,
    capacity: count,
    state: text,
    assignedDriverName: text,
    plateNumber: text,
    name: text,
    lastName: text,
    status: text,
    licenseNumber: text,
    licenseType: text,
    licenseExpirationDate: text,
    currentKm: count,
    startKm: count,
    endKm: count,
    completedTrips: count,
    soldNotCancelledCount: count,
    origin: text,
    destination: text,
    departureAt: text,
    returnDepartureAt: text,
    outboundBusId: id.nullish(),
    returnBusId: id.nullish(),
    outboundPlateNumber: text,
    returnPlateNumber: text,
    distanceKm: z.union([z.number().finite().nonnegative(), DecimalStringSchema]).nullish(),
    ratePerKmApplied: amount,
    passengerCount: count,
    waitHours: DecimalStringSchema.nullish(),
    amount,
    totalAmount: amount,
    paidAmount: amount,
    income: amount,
    refunds: amount,
    costs: amount,
    net: amount,
    fuelCost: amount,
    depreciationCost: amount,
    driverSalaryCost: amount,
    totalCost: amount,
    categoryName: text,
    lineType: text,
  })
  .refine(
    (row) => Object.values(row).some((value) => value !== undefined && value !== null),
    "El reporte no contiene ninguna columna reconocida",
  );
export const ReportBranchSchema = z.object({
  branchId: id,
  branchName: z.string().optional(),
  entries: z.array(ReportRowSchema),
  subtotal: DecimalStringSchema,
});
export const ReportProfitSchema = z.object({
  branches: z.array(
    z.object({
      branchId: id,
      branchName: z.string().optional(),
      income: DecimalStringSchema,
      refunds: DecimalStringSchema,
      costs: DecimalStringSchema,
      net: DecimalStringSchema,
    }),
  ),
  grandTotal: DecimalStringSchema,
});
export const ReportDemandSchema = z.array(
  z.object({
    routeId: id,
    originBranchId: id,
    soldNotCancelledCount: z.number().int().nonnegative().safe(),
  }),
);
export const ReportCategorySchema = z.object({
  categories: z.array(
    z.object({
      categoryId: id,
      categoryName: z.string(),
      lines: z.array(ReportRowSchema),
      subtotal: DecimalStringSchema,
    }),
  ),
  grandTotal: DecimalStringSchema,
});
export const ReportMapSchema = z.array(
  z.object({
    routeId: id,
    origin: z.object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
    }),
    destination: z.object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
    }),
  }),
);
export const AnalyticsReportSchema = z.object({
  kind: ReportKindSchema,
  sections: z.array(
    z.object({
      title: z.string(),
      rows: z.array(
        z.record(z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.undefined()])),
      ),
      subtotal: DecimalStringSchema.optional(),
    }),
  ),
  grandTotal: DecimalStringSchema.optional(),
  mapRoutes: ReportMapSchema.optional(),
  filters: z.record(z.string()),
}) satisfies z.ZodType<AnalyticsReport, z.ZodTypeDef, unknown>;
