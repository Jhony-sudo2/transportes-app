import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getManagedDriver } from "@/lib/api/branch-drivers";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { canDeleteDriverRequest } from "@/lib/driver-management";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const id = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
    if (!id.success)
      return NextResponse.json(
        { detail: "El identificador del chofer no es válido." },
        { status: 400 },
      );
    const { driver, token, branchId } = await getManagedDriver(
      id.data,
      Number(request.nextUrl.searchParams.get("branchId")),
    );
    if (!canDeleteDriverRequest(driver))
      throw new ApplicationError(
        "resource.conflict",
        409,
        "Solo se pueden eliminar solicitudes rechazadas sin cuenta vinculada ni operaciones pendientes.",
      );
    const result = await fleetRequest(`drivers/${id.data}`, token, undefined, "DELETE");
    if (result !== null)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar la eliminación. Actualiza las solicitudes antes de volver a intentarlo.",
      );
    return NextResponse.json({ deletedId: id.data, branchId });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
