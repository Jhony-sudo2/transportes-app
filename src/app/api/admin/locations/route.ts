import "server-only";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { LocationListSchema } from "@/lib/validators/branch";
import { ApplicationError } from "@/types/error";
export async function GET(request: NextRequest) {
  try {
    const { token } = await requireAdminAccess();
    const raw = request.nextUrl.searchParams.get("departmentId");
    let path: "directions/departments" | `directions/departments/${number}/municipalities` =
      "directions/departments";
    if (raw !== null) {
      const id = z.coerce.number().int().positive().safeParse(raw);
      if (!id.success)
        return NextResponse.json({ detail: "Selecciona un departamento válido." }, { status: 400 });
      path = `directions/departments/${id.data}/municipalities`;
    }
    const locations = LocationListSchema.safeParse(await fleetRequest(path, token));
    if (!locations.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "El catálogo de ubicaciones no tiene el formato esperado.",
      );
    return NextResponse.json(locations.data);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
