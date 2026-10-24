import "server-only";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireSelectedBranch, validatedFleetResult } from "@/lib/api/branch-workspace";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { DriverOperationIdSchema, DriverOperationSchema } from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; operationId: string }> },
) {
  try {
    const params = await context.params;
    const id = ManagedBranchIdSchema.safeParse(Number(params.id));
    const operationId = DriverOperationIdSchema.safeParse(params.operationId);
    if (!id.success || !operationId.success)
      return NextResponse.json(
        { detail: "La referencia del registro no es válida." },
        { status: 400 },
      );
    const { token, branchId } = await requireSelectedBranch(
      Number(request.nextUrl.searchParams.get("branchId")),
    );
    const drivers = validatedFleetResult(
      z.array(z.object({ id: ManagedBranchIdSchema })),
      await fleetRequest(`branches/${branchId}/drivers`, token),
    );
    if (!drivers.some((driver) => driver.id === id.data))
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "El chofer no pertenece a la sucursal seleccionada.",
      );
    const operation = validatedFleetResult(
      DriverOperationSchema,
      await fleetRequest(`drivers/${id.data}/operations/${operationId.data}`, token),
    );
    if (operation.driverId !== id.data || operation.operationId !== operationId.data)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no corresponde al registro solicitado.",
      );
    return NextResponse.json(operation);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
