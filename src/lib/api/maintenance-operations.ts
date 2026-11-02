import "server-only";
import { NextRequest, NextResponse } from "next/server";
import * as V from "@/lib/validators/maintenance";
import { OperationKeySchema, DateRangeSchema } from "@/lib/validators/commerce";
import { BusListSchema } from "@/lib/validators/fleet-resources";
import { ManagedBranchIdSchema as id } from "@/lib/validators/branch-context";
import { operationsAccess } from "./operations-access";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "./transport-service";
import { adminErrorResponse } from "./admin";
import { ApplicationError } from "@/types/error";
export async function maintenanceOperation(request: NextRequest, segments: string[]) {
  try {
    const path = segments.join("/"),
      method = request.method;
    if (method !== "GET") requireSameOrigin(request);
    const category = segments[0] === "categories",
      a = await operationsAccess(
        request,
        category ? ["ADMIN", "SUCURSAL_ADMIN"] : ["SUCURSAL_ADMIN"],
        true,
      );
    const key =
      method === "GET"
        ? undefined
        : checkedBody(OperationKeySchema, request.headers.get("Idempotency-Key"));
    const input = method === "GET" ? undefined : await request.json().catch(() => null);
    if (path === "categories" && method === "GET")
      return NextResponse.json(
        serviceResult(V.CategorySchema.array(), await transportService("expense-categories", a)),
      );
    if (
      category &&
      ((path === "categories" && method === "POST") ||
        (segments.length === 2 && method === "PATCH"))
    ) {
      const body = checkedBody(V.CategoryInputSchema, input),
        categoryId = segments.length === 2 ? checkedBody(id, Number(segments[1])) : null;
      const result = serviceResult(
        V.CategorySchema,
        await transportService(`expense-categories${categoryId ? `/${categoryId}` : ""}`, {
          ...a,
          body,
          method: method === "PATCH" ? "PATCH" : "POST",
          idempotencyKey: key,
        }),
      );
      if (
        result.name !== body.name ||
        result.active !== body.active ||
        (categoryId !== null && result.categoryId !== categoryId)
      )
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se pudo confirmar la categoría actualizada.",
        );
      return NextResponse.json(result, { status: method === "POST" ? 201 : 200 });
    }
    const buses = serviceResult(
      BusListSchema,
      await transportService(`branches/${a.branchId}/buses`, a),
    );
    if (path === "buses" && method === "GET") return NextResponse.json(buses);
    if (path === "services" && method === "GET") {
      const query = request.nextUrl.searchParams,
        range = checkedBody(
          DateRangeSchema,
          Object.fromEntries([...query].filter(([k]) => k !== "branchId" && k !== "busId")),
        ),
        params = new URLSearchParams(
          Object.entries(range).filter((e): e is [string, string] => e[1] !== undefined),
        );
      params.set("branchId", String(a.branchId));
      if (query.has("busId")) {
        const busId = checkedBody(id, Number(query.get("busId")));
        if (!buses.some((b) => b.id === busId))
          throw new ApplicationError("auth.forbidden", 403, "El bus no pertenece a la sucursal.");
        params.set("busId", String(busId));
      }
      const services = serviceResult(
        V.WorkshopServiceSchema.array(),
        await transportService(`workshop-services?${params}`, a),
      );
      if (services.some((s) => !buses.some((b) => b.id === s.busId)))
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "El historial contiene buses de otra sucursal.",
        );
      return NextResponse.json(services);
    }
    if (path === "services" && method === "POST") {
      const body = checkedBody(V.WorkshopInputSchema, input);
      if (!buses.some((b) => b.id === body.busId))
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "No puedes registrar mantenimiento sobre un bus ajeno.",
        );
      const categories = serviceResult(
        V.CategorySchema.array(),
        await transportService("expense-categories", a),
      );
      if (
        body.lines.some((l) => !categories.some((c) => c.categoryId === l.categoryId && c.active))
      )
        throw new ApplicationError(
          "validation.failed",
          422,
          "Selecciona categorías activas para todos los detalles.",
        );
      const result = serviceResult(
        V.WorkshopServiceSchema,
        await transportService("workshop-services", { ...a, body, idempotencyKey: key }),
      );
      if (
        result.busId !== body.busId ||
        result.serviceDate !== body.serviceDate ||
        JSON.stringify(result.lines) !== JSON.stringify(body.lines)
      )
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se pudo confirmar el servicio y sus detalles.",
        );
      return NextResponse.json(result, { status: 201 });
    }
    if (segments[0] === "services" && segments.length === 2 && method === "GET") {
      const serviceId = checkedBody(id, Number(segments[1])),
        service = serviceResult(
          V.WorkshopServiceSchema,
          await transportService(`workshop-services/${serviceId}`, a),
        );
      if (service.workshopServiceId !== serviceId || !buses.some((b) => b.id === service.busId))
        throw new ApplicationError(
          "auth.forbidden",
          403,
          "No puedes consultar el servicio de un bus ajeno.",
        );
      return NextResponse.json(service);
    }
    throw new ApplicationError("resource.not_found", 404, "Operación no disponible.");
  } catch (error) {
    return adminErrorResponse(error);
  }
}
