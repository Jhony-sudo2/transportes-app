import { BusListSchema } from "@/lib/validators/fleet-resources";
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  getBranchWorkspace,
  requireSelectedBranch,
  validatedFleetResult,
} from "@/lib/api/branch-workspace";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { CreateBusSchema, CreatedBusSchema } from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";
import { readBusMultipart, busMultipart } from "@/lib/api/bus-multipart";
import { getBusTypeForUnit } from "@/lib/api/bus-types";
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const workspace = await getBranchWorkspace();
    const { raw, photo } = await readBusMultipart(request, true);
    const parsed = CreateBusSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const { token, branchId } = await requireSelectedBranch(parsed.data.branchId, workspace);
    const type = await getBusTypeForUnit(
      token,
      parsed.data.busTypeId,
      parsed.data.seatRows,
      parsed.data.seatColumns,
    );
    const bus = validatedFleetResult(
      CreatedBusSchema,
      await fleetRequest(
        "buses",
        token,
        busMultipart({ ...parsed.data, branchId, capacity: type.capacity }, photo),
      ),
    );
    if (
      bus.busTypeId !== type.id ||
      bus.capacity !== type.capacity ||
      bus.rentalEnabled !== parsed.data.rentalEnabled
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no confirma el tipo, capacidad y habilitación de alquiler del bus. Consulta el listado antes de repetir el alta.",
      );
    return NextResponse.json({ bus, branchId }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { token, branchId } = await requireSelectedBranch(
      Number(request.nextUrl.searchParams.get("branchId")),
    );
    const items = validatedFleetResult(
      BusListSchema,
      await fleetRequest(`branches/${branchId}/buses`, token),
      "No se pudo cargar el listado de la sucursal. Inténtalo nuevamente.",
    );
    return NextResponse.json({ items, branchId });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
