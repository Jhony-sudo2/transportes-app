import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAccountAccess, getOwnDriver } from "@/lib/api/account";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { validatedFleetResult } from "@/lib/api/branch-workspace";
import { DriverOperationIdSchema } from "@/lib/validators/fleet-resources";
import { AccountProfileOperationSchema } from "@/lib/validators/account";
import { ApplicationError } from "@/types/error";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ operationId: string }> },
) {
  try {
    const access = await requireAccountAccess();
    const driver = await getOwnDriver(access);
    const id = DriverOperationIdSchema.safeParse((await context.params).operationId);
    if (!id.success)
      return NextResponse.json(
        { detail: "La referencia del cambio no es válida." },
        { status: 400 },
      );
    const operation = validatedFleetResult(
      AccountProfileOperationSchema,
      await fleetRequest(`drivers/${driver.id}/operations/${id.data}`, access.token),
      "No se pudo confirmar el estado del cambio de tu perfil.",
    );
    if (operation.driverId !== driver.id || operation.operationId !== id.data)
      throw new ApplicationError("auth.forbidden", 403, "La operación no corresponde a tu perfil.");
    return NextResponse.json(operation);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
