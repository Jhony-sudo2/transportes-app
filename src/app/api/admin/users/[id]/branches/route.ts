import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminRequest, adminErrorResponse } from "@/lib/api/admin";
import {
  AdminBranchIdsSchema,
  AssignAdminBranchSchema,
  StaffUserResultSchema,
} from "@/lib/validators/admin-user";
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
    const current = AdminBranchIdsSchema.safeParse(
      await adminRequest(`users/${id}/branches`, token),
    );
    if (!current.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudieron verificar las sucursales actuales.",
      );
    const branchIds = [...new Set([...current.data, parsed.data.branchId])];
    const updated = StaffUserResultSchema.safeParse(
      await adminRequest(`users/staff/${id}`, token, { branchIds }, "PATCH"),
    );
    if (
      !updated.success ||
      updated.data.id !== id ||
      updated.data.role.name !== "SUCURSAL_ADMIN" ||
      !branchIds.every((branchId) => updated.data.branchIds?.includes(branchId))
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar la asignación. Actualiza las sucursales antes de repetirla.",
      );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
