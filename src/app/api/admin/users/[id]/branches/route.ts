import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminRequest, adminErrorResponse } from "@/lib/api/admin";
import { AdminBranchIdsSchema, AssignAdminBranchSchema } from "@/lib/validators/admin-user";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";
type Context = { params: Promise<{ id: string }> };
async function userId(context: Context) {
  const parsed = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
  if (!parsed.success) throw new ApplicationError("validation.failed", 400, "Usuario inválido.");
  return parsed.data;
}
export async function GET(_request: NextRequest, context: Context) {
  try {
    const { token } = await requireAdminAccess();
    const id = await userId(context);
    const result = AdminBranchIdsSchema.safeParse(
      await adminRequest(`users/${id}/branches`, token),
    );
    if (!result.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudieron verificar las sucursales asignadas.",
      );
    return NextResponse.json(result.data);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { token } = await requireAdminAccess();
    const id = await userId(context);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = AssignAdminBranchSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError("validation.failed", 400, "Selecciona una sucursal válida.");
    await adminRequest("users/branch-administrators", token, {
      userId: id,
      branchId: parsed.data.branchId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
