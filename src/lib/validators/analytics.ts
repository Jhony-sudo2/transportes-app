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
  .regex(/^-?\d+\.\d{2}(?:\d{2})?$/, "Los importes del reporte no tienen un formato válido");
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
    sourceBranchId: id.nullish(),
    originBranchId: id.nullish(),
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
export const ReportRowResponseSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const row = raw as Record<string, unknown>;
  return {
    ...row,
    occurredAt: row.occurredAt ?? row.date,
    customerName: row.customerName ?? row.customer,
    distanceKm: row.distanceKm ?? row.kmDistance,
    ratePerKmApplied: row.ratePerKmApplied ?? row.depreciationRateApplied,
  };
}, ReportRowSchema);
export const ReportBranchSchema = z.object({
  branchId: id,
  branchName: z.string().optional(),
  entries: z.array(ReportRowResponseSchema),
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
export const ReportDemandResponseSchema = z.object({
  report: z.literal("routes-demand"),
  rows: ReportDemandSchema,
});
export const ReportCategorySchema = z.object({
  categories: z.array(
    z.object({
      categoryId: id,
      categoryName: z.string(),
      lines: z.array(ReportRowResponseSchema),
      subtotal: DecimalStringSchema,
    }),
  ),
  grandTotal: DecimalStringSchema,
});
export const ReportCategoryResponseSchema = z.object({
  report: z.enum(["workshop-categories", "WORKSHOP"]),
  filters: z.object({ branchId: id.nullish() }),
  rows: ReportCategorySchema.shape.categories,
  grandTotal: DecimalStringSchema,
});
export const ReportBranchOperationsResponseSchema = z.object({
  report: z.enum(["TICKET_SALES", "RENTALS", "DEPRECIATION"]),
  filters: z.object({ branchId: id }),
  rows: z.array(ReportRowResponseSchema),
  subtotals: z.record(DecimalStringSchema),
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
export const ReportMapResponseSchema = z.object({
  report: z.literal("route-map"),
  filters: z.object({ branchId: id }),
  rows: ReportMapSchema,
});
const nameMap = z.record(z.string());
export const ReportNamesSchema = z.object({
  branches: nameMap,
  routes: nameMap,
  users: nameMap,
  buses: nameMap,
  drivers: nameMap,
});
export const ReportBusOptionListSchema = z.array(
  z.object({
    id,
    label: z.string(),
    busTypeName: z.string(),
    branchId: id,
    branchName: z.string(),
  }),
);
export const ReportRouteOptionListSchema = z.array(z.object({ id, label: z.string() }));
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
  incomingRoutes: ReportMapSchema.optional(),
  names: ReportNamesSchema.optional(),
  filters: z.record(z.string()),
}) satisfies z.ZodType<AnalyticsReport, z.ZodTypeDef, unknown>;
