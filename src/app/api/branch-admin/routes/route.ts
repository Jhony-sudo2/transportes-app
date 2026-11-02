import { NextRequest, NextResponse } from "next/server";
import { branchJourneyAccess, branchRoutes, routeBranches } from "@/lib/api/journey";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "@/lib/api/transport-service";
import { RegularRouteInputSchema, RegularRouteSchema } from "@/lib/validators/journey";
import { adminErrorResponse } from "@/lib/api/admin";
import { ApplicationError } from "@/types/error";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      await branchRoutes(
        await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId"))),
      ),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const access = await branchJourneyAccess(Number(request.nextUrl.searchParams.get("branchId")));
    const input = checkedBody(RegularRouteInputSchema, await request.json().catch(() => null));
    if (input.originBranchId !== access.branchId)
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "La ruta debe salir de la sucursal seleccionada.",
      );
    await routeBranches(access.branchId, input.destinationBranchId, access.token);
    const route = serviceResult(
      RegularRouteSchema,
      await transportService("routes", { ...access, body: input }),
    );
    if (
      route.originBranchId !== input.originBranchId ||
      route.destinationBranchId !== input.destinationBranchId ||
      route.distanceKm !== input.distanceKm ||
      route.ticketPrice !== input.ticketPrice
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar la ruta creada. Consulta el listado antes de repetir el alta.",
      );
    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
