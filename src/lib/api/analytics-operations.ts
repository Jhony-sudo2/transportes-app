import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as V from "@/lib/validators/analytics";
import { DateRangeSchema } from "@/lib/validators/commerce";
import { ManagedBranchIdSchema as id } from "@/lib/validators/branch-context";
import { BranchListSchema } from "@/lib/validators/branch";
import { operationsAccess } from "./operations-access";
import { checkedBody, serviceResult, transportService } from "./transport-service";
import { adminErrorResponse } from "./admin";
import { ApplicationError } from "@/types/error";
import type { AnalyticsReport } from "@/types/analytics";
export async function analyticsOperation(request: NextRequest, kindRaw: string) {
  try {
    if (kindRaw === "context") {
      const a = await operationsAccess(request, ["ADMIN", "SUCURSAL_ADMIN"], true),
        branches = serviceResult(BranchListSchema, await transportService("branches", a));
      return NextResponse.json(branches.filter((b) => !a.branchId || b.id === a.branchId));
    }
    const kind = checkedBody(V.ReportKindSchema, kindRaw),
      local = kind === "fleet-operations" || kind === "branch-operations",
      a = await operationsAccess(request, local ? ["SUCURSAL_ADMIN"] : ["ADMIN"], local);
    const params = new URLSearchParams(),
      query = request.nextUrl.searchParams;
    const allowed = new Set([
      ...(kind !== "route-map" && kind !== "fleet-operations" ? ["dateFrom", "dateTo"] : []),
      ...(kind === "profit" || kind === "workshop-categories" || local ? ["branchId"] : []),
      ...(kind === "workshop-categories" || kind === "branch-operations" ? ["busId"] : []),
      ...(kind === "branch-operations" ? ["routeId", "kind"] : []),
      ...(kind === "fleet-operations" ? ["status"] : []),
      ...(kind === "route-map" ? ["originBranchId"] : []),
    ]);
    if ([...query.keys()].some((key) => !allowed.has(key)))
      throw new ApplicationError(
        "validation.failed",
        400,
        "El reporte no admite alguno de los filtros indicados.",
      );
    const range = checkedBody(DateRangeSchema, {
      ...(query.has("dateFrom") ? { dateFrom: query.get("dateFrom") } : {}),
      ...(query.has("dateTo") ? { dateTo: query.get("dateTo") } : {}),
    });
    for (const [k, v] of Object.entries(range)) if (v) params.set(k, v);
    for (const key of ["branchId", "busId", "routeId", "originBranchId"]) {
      if (query.has(key)) params.set(key, String(checkedBody(id, Number(query.get(key)))));
    }
    if (a.branchId) params.set("branchId", String(a.branchId));
    if (kind === "branch-operations")
      params.set(
        "kind",
        checkedBody(
          z.enum(["TICKET_SALES", "RENTALS", "DEPRECIATION", "WORKSHOP"]),
          query.get("kind"),
        ),
      );
    if (kind === "route-map" && !params.has("originBranchId"))
      throw new ApplicationError(
        "validation.failed",
        400,
        "Selecciona la sucursal de origen del mapa.",
      );
    if (query.has("status"))
      params.set(
        "status",
        checkedBody(
          z.enum([
            "AVAILABLE",
            "OUT_OF_SERVICE",
            "IN_SERVICE",
            "ACTIVE",
            "INACTIVE",
            "PENDING",
            "ACCOUNT_REJECTED",
            "SCHEDULED",
            "COMPLETED",
          ]),
          query.get("status"),
        ),
      );
    const raw = await transportService(`reports/${kind}?${params}`, a),
      report: AnalyticsReport = { kind, sections: [], filters: Object.fromEntries(params) };
    if (kind === "income" || kind === "expenses") {
      const source = serviceResult(
        z.object({ branches: z.array(V.ReportBranchSchema), grandTotal: V.DecimalStringSchema }),
        raw,
      );
      report.sections = source.branches
        .sort((x, y) =>
          (x.branchName ?? String(x.branchId)).localeCompare(
            y.branchName ?? String(y.branchId),
            "es",
          ),
        )
        .map((b) => ({
          title: b.branchName ?? `Sucursal #${b.branchId}`,
          rows: b.entries,
          subtotal: b.subtotal,
        }));
      report.grandTotal = source.grandTotal;
    } else if (kind === "profit") {
      const source = serviceResult(V.ReportProfitSchema, raw);
      report.sections = [{ title: "Ganancias por sucursal", rows: source.branches }];
      report.grandTotal = source.grandTotal;
    } else if (kind === "routes-demand")
      report.sections = [
        {
          title: "Demanda de rutas · boletos pagados vigentes",
          rows: serviceResult(V.ReportDemandSchema, raw),
        },
      ];
    else if (kind === "workshop-categories") {
      const source = serviceResult(V.ReportCategorySchema, raw);
      report.sections = source.categories.map((c) => ({
        title: c.categoryName,
        rows: c.lines,
        subtotal: c.subtotal,
      }));
      report.grandTotal = source.grandTotal;
    } else if (kind === "route-map") {
      report.mapRoutes = serviceResult(V.ReportMapSchema, raw);
      report.sections = [
        {
          title: "Rutas por origen",
          rows: report.mapRoutes.map((r) => ({
            routeId: r.routeId,
            origin: `${r.origin.lat}, ${r.origin.lng}`,
            destination: `${r.destination.lat}, ${r.destination.lng}`,
          })),
        },
      ];
    } else if (kind === "fleet-operations") {
      const source = serviceResult(
        z.object({ buses: z.array(V.ReportRowSchema), drivers: z.array(V.ReportRowSchema) }),
        raw,
      );
      if (
        [...source.buses, ...source.drivers].some(
          (row) => row.branchId != null && row.branchId !== a.branchId,
        )
      )
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "El reporte contiene recursos de otra sucursal.",
        );
      report.sections = [
        { title: "Buses de la sucursal", rows: source.buses },
        { title: "Choferes de la sucursal", rows: source.drivers },
      ];
    } else {
      const source = serviceResult(
        z.object({
          rows: z.array(V.ReportRowSchema),
          subtotals: z
            .array(z.object({ label: z.string(), amount: V.DecimalStringSchema }))
            .optional(),
          grandTotal: V.DecimalStringSchema,
        }),
        raw,
      );
      if (source.rows.some((row) => row.branchId != null && row.branchId !== a.branchId))
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "El reporte contiene operaciones de otra sucursal.",
        );
      report.sections = [
        { title: "Operaciones de la sucursal", rows: source.rows },
        ...(source.subtotals ?? []).map((s) => ({ title: s.label, rows: [], subtotal: s.amount })),
      ];
      report.grandTotal = source.grandTotal;
    }
    return NextResponse.json(serviceResult(V.AnalyticsReportSchema, report));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
