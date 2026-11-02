import { NextRequest, NextResponse } from "next/server";
import { branchJourneyAccess, ownRoute, routeBranches } from "@/lib/api/journey";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "@/lib/api/transport-service";
import { RegularRouteInputSchema, RegularRouteSchema } from "@/lib/validators/journey";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { adminErrorResponse } from "@/lib/api/admin";
import { ApplicationError } from "@/types/error";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    const id = checkedBody(ManagedBranchIdSchema, Number((await context.params).id));
    await ownRoute(id, access);
    const input = checkedBody(RegularRouteInputSchema, await request.json().catch(() => null));
    if (input.originBranchId !== access.branchId)
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "No puedes cambiar el origen fuera de tu sucursal.",
      );
    await routeBranches(access.branchId, input.destinationBranchId, access.token);
    const route = serviceResult(
      RegularRouteSchema,
      await transportService(`routes/${id}`, { ...access, body: input, method: "PATCH" }),
    );
    if (
      route.routeId !== id ||
      route.originBranchId !== access.branchId ||
      route.destinationBranchId !== input.destinationBranchId ||
      route.distanceKm !== input.distanceKm ||
      route.ticketPrice !== input.ticketPrice
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar la actualización de la ruta. Consulta su estado.",
      );
    return NextResponse.json(route);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    const id = checkedBody(ManagedBranchIdSchema, Number((await context.params).id));
    await ownRoute(id, access);
    const result = await transportService(`routes/${id}`, { ...access, method: "DELETE" });
    if (result !== null)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar la eliminación. Actualiza las rutas antes de repetirla.",
      );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
