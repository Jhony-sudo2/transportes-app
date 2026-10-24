import "server-only";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { BranchSchema, UpdateBranchSchema } from "@/lib/validators/branch";
import { ApplicationError } from "@/types/error";

type Context = { params: Promise<{ id: string }> };
async function branchId(context: Context) {
  const parsed = z.coerce
    .number()
    .int()
    .positive()
    .safe()
    .safeParse((await context.params).id);
  if (!parsed.success)
    throw new ApplicationError("resource.not_found", 400, "Identificador de sucursal inválido.");
  return parsed.data;
}
function checkedBranch(raw: unknown, id: number) {
  const parsed = BranchSchema.safeParse(raw);
  if (!parsed.success || parsed.data.id !== id)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo confirmar la sucursal. Actualiza el listado antes de volver a guardar.",
    );
  return parsed.data;
}
export async function GET(_request: NextRequest, context: Context) {
  try {
    const { token } = await requireAdminAccess();
    const id = await branchId(context);
    return NextResponse.json(checkedBranch(await fleetRequest(`branches/${id}`, token), id));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { token } = await requireAdminAccess();
    const id = await branchId(context);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = UpdateBranchSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const updated = await fleetRequest(`branches/${id}`, token, parsed.data, "PUT");
    return NextResponse.json(checkedBranch(updated, id));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
