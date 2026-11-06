import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as V from "@/lib/validators/analytics";
import { DateRangeSchema } from "@/lib/validators/commerce";
import { ManagedBranchIdSchema as id } from "@/lib/validators/branch-context";
import { BranchListSchema, BranchSchema } from "@/lib/validators/branch";
import { operationsAccess } from "./operations-access";
import { checkedBody, serviceResult, transportService } from "./transport-service";
import { adminErrorResponse } from "./admin";
import { ApplicationError } from "@/types/error";
import type { AnalyticsReport } from "@/types/analytics";
import { busOptions, incomingRoutes, resolveReportNames, routeOptions } from "./analytics-names";
type ReportAccess = Parameters<typeof resolveReportNames>[1];
/** Agrega los nombres (sucursal, ruta, vendedor, bus, chofer) y valida la respuesta final. */
async function finish(report: AnalyticsReport, a: ReportAccess, subtotalBranches: string[] = []) {
  report.names = await resolveReportNames(report, a);
  const names = report.names.branches;
  if (subtotalBranches.length)
    report.sections = report.sections.map((section, index) => {
      const branch = subtotalBranches[index];
      return branch
        ? { ...section, title: `Subtotal de ${names[branch] ?? `sucursal #${branch}`}` }
        : section;
    });
  if (report.kind === "route-map") {
    const origin = Number(report.filters["originBranchId"]),
      branchName = names[String(origin)] ?? `la sucursal #${origin}`,
      rows = (routes: AnalyticsReport["mapRoutes"], direction: string) =>
        (routes ?? []).map((r) => ({ routeId: r.routeId, direction }));
    report.sections = [
      {
        title: `Rutas que salen de ${branchName} (origen)`,
        rows: rows(report.mapRoutes, "Origen"),
      },
      {
        title: `Rutas que llegan a ${branchName} (destino)`,
        rows: rows(report.incomingRoutes, "Destino"),
      },
    ];
  }
  return NextResponse.json(serviceResult(V.AnalyticsReportSchema, report));
}
export async function analyticsOperation(request: NextRequest, kindRaw: string) {
  try {
    if (kindRaw === "context") {
      const a = await operationsAccess(request, ["ADMIN", "SUCURSAL_ADMIN"], true),
        branches = a.branchId
          ? [serviceResult(BranchSchema, await transportService(`branches/${a.branchId}`, a))]
          : serviceResult(BranchListSchema, await transportService("branches", a));
      return NextResponse.json(branches.filter((b) => !a.branchId || b.id === a.branchId));
    }
    // Opciones con nombre para los filtros opcionales de bus y ruta (en vez de escribir IDs).
    if (kindRaw === "buses" || kindRaw === "routes") {
      const a = await operationsAccess(request, ["ADMIN", "SUCURSAL_ADMIN"], true),
        selected = request.nextUrl.searchParams.get("branchId"),
        branchId = a.branchId ?? (selected ? checkedBody(id, Number(selected)) : undefined);
      return NextResponse.json(
        kindRaw === "buses"
          ? serviceResult(V.ReportBusOptionListSchema, await busOptions(a, branchId))
          : serviceResult(V.ReportRouteOptionListSchema, await routeOptions(a, branchId)),
      );
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
          rows: serviceResult(V.ReportDemandResponseSchema, raw).rows,
        },
      ];
    else if (kind === "workshop-categories") {
      const source = serviceResult(V.ReportCategoryResponseSchema, raw);
      if (source.report !== kind)
        throw new ApplicationError(
          "system.internal_error",
          502,
          "El reporte recibido no corresponde al solicitado.",
        );
      report.sections = source.rows.map((c) => ({
        title: c.categoryName,
        rows: c.lines,
        subtotal: c.subtotal,
      }));
      report.grandTotal = source.grandTotal;
    } else if (kind === "route-map") {
      const source = serviceResult(V.ReportMapResponseSchema, raw);
      if (source.filters.branchId !== Number(params.get("originBranchId")))
        throw new ApplicationError(
          "system.internal_error",
          502,
          "El mapa recibido no corresponde a la sucursal de origen solicitada.",
        );
      report.mapRoutes = source.rows;
      // Analytics solo devuelve rutas donde la sucursal es ORIGEN; las de DESTINO se leen de Journey.
      report.incomingRoutes = await incomingRoutes(
        a,
        Number(params.get("originBranchId")),
        source.rows,
      );
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
      if (params.get("kind") === "WORKSHOP") {
        const source = serviceResult(V.ReportCategoryResponseSchema, raw);
        if (
          source.report !== "WORKSHOP" ||
          source.filters.branchId !== a.branchId ||
          source.rows.some((category) =>
            category.lines.some((row) => row.branchId != null && row.branchId !== a.branchId),
          )
        )
          throw new ApplicationError(
            "auth.forbidden",
            403,
            "El reporte de taller no corresponde a tu sucursal.",
          );
        report.sections = source.rows.map((category) => ({
          title: category.categoryName,
          rows: category.lines,
          subtotal: category.subtotal,
        }));
        report.grandTotal = source.grandTotal;
        return await finish(report, a);
      }
      const source = serviceResult(V.ReportBranchOperationsResponseSchema, raw);
      if (
        source.filters.branchId !== a.branchId ||
        source.report !== params.get("kind") ||
        Object.keys(source.subtotals).some((branch) => branch !== String(a.branchId)) ||
        source.rows.some((row) => row.branchId != null && row.branchId !== a.branchId)
      )
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "El reporte contiene operaciones de otra sucursal.",
        );
      report.sections = [
        { title: "Operaciones de la sucursal", rows: source.rows },
        ...Object.entries(source.subtotals).map(([branch, amount]) => ({
          title: `Subtotal de sucursal #${branch}`,
          rows: [],
          subtotal: amount,
        })),
      ];
      report.grandTotal = source.grandTotal;
      return await finish(report, a, ["", ...Object.keys(source.subtotals)]);
    }
    return await finish(report, a);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
