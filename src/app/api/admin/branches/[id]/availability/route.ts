import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { BranchStatusResponseSchema } from "@/lib/validators/branch";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { token } = await requireAdminAccess();
    const id = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
    const body = z
      .object({ active: z.boolean() })
      .strict()
      .safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Indica una sucursal y un estado válidos.",
      );
    const item = BranchStatusResponseSchema.safeParse(
      await fleetRequest(`branches/${id.data}`, token, body.data, "PATCH"),
    );
    if (!item.success || item.data.id !== id.data || item.data.active !== body.data.active)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el estado de la sucursal. Actualiza el listado antes de repetir la operación.",
      );
    return NextResponse.json(item.data);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
