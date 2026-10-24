import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { BranchListSchema, BranchSchema, CreateBranchSchema } from "@/lib/validators/branch";
import { ApplicationError } from "@/types/error";
export async function GET() {
  try {
    const { token } = await requireAdminAccess();
    const result = BranchListSchema.safeParse(await fleetRequest("branches", token));
    if (!result.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "Las sucursales no tienen el formato esperado.",
      );
    return NextResponse.json(result.data);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { token } = await requireAdminAccess();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = CreateBranchSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const response = BranchSchema.safeParse(await fleetRequest("branches", token, parsed.data));
    if (!response.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el alta. Actualiza el listado antes de volver a guardar.",
      );
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
