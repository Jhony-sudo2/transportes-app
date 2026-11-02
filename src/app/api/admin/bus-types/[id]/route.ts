import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { validatedFleetResult } from "@/lib/api/branch-workspace";
import { BusTypeInputSchema, BusTypeSchema } from "@/lib/validators/bus-type";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { token } = await requireAdminAccess();
    const id = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
    if (!id.success) throw new ApplicationError("validation.failed", 400, "Tipo de bus inválido.");
    const parsed = BusTypeInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    const item = validatedFleetResult(
      BusTypeSchema,
      await fleetRequest(`bus-types/${id.data}`, token, parsed.data, "PATCH"),
    );
    if (
      item.id !== id.data ||
      Object.entries(parsed.data).some(([key, value]) => item[key as keyof typeof item] !== value)
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no confirma la actualización. Consulta el catálogo antes de volver a guardar.",
      );
    return NextResponse.json(item);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
