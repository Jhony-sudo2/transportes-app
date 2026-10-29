import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse } from "@/lib/api/admin";
import {
  getBranchWorkspace,
  requireSelectedBranch,
  validatedFleetResult,
} from "@/lib/api/branch-workspace";
import { readBusMultipart, busMultipart } from "@/lib/api/bus-multipart";
import { fleetRequest } from "@/lib/api/fleet";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import {
  BusListSchema,
  BusListRecordSchema,
  UpdateBusSchema,
} from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const workspace = await getBranchWorkspace();
    const id = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
    if (!id.success) throw new ApplicationError("validation.failed", 400, "Bus inválido.");
    const { raw, photo } = await readBusMultipart(request, false, "data");
    const parsed = UpdateBusSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    const { token, branchId } = await requireSelectedBranch(parsed.data.branchId, workspace);
    const buses = validatedFleetResult(
      BusListSchema,
      await fleetRequest(`branches/${branchId}/buses`, token),
    );
    if (!buses.some((bus) => bus.id === id.data))
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "El bus no pertenece a la sucursal seleccionada.",
      );
    const { branchId: _branchId, ...data } = parsed.data;
    const unconfirmed =
      "No se pudo confirmar la actualización. Consulta el listado antes de volver a guardar.";
    const item = validatedFleetResult(
      BusListRecordSchema,
      await fleetRequest(`buses/${id.data}`, token, busMultipart(data, photo, "data"), "PUT"),
      unconfirmed,
    );
    if (
      item.id !== id.data ||
      item.plateNumber !== data.plateNumber.trim().toUpperCase() ||
      item.brand !== data.brand ||
      item.model !== String(data.model) ||
      item.yearManufacture !== data.yearManufacture ||
      item.capacity !== data.capacity ||
      item.seatRows !== data.seatRows ||
      item.seatColumns !== data.seatColumns ||
      (photo && !item.photo)
    )
      throw new ApplicationError("system.internal_error", 502, unconfirmed);
    return NextResponse.json({ item, branchId });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
