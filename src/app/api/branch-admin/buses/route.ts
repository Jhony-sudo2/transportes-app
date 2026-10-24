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
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const workspace = await getBranchWorkspace();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = CreateBusSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const { token, branchId } = await requireSelectedBranch(parsed.data.branchId, workspace);
    const bus = validatedFleetResult(
      CreatedBusSchema,
      await fleetRequest("buses", token, { ...parsed.data, branchId }),
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
