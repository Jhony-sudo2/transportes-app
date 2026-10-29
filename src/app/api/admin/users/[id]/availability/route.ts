import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminRequest, adminErrorResponse } from "@/lib/api/admin";
import { AdminUserSchema, AdminUserAvailabilitySchema } from "@/lib/validators/admin-user";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { ApplicationError } from "@/types/error";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const access = await requireAdminAccess();
    const id = ManagedBranchIdSchema.safeParse(Number((await context.params).id));
    if (!id.success) throw new ApplicationError("validation.failed", 400, "Usuario inválido.");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = AdminUserAvailabilitySchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Indica un estado activo válido para la cuenta.",
      );
    const user = AdminUserSchema.safeParse(
      await adminRequest(
        `users/${id.data}/${parsed.data.isActive ? "activate" : "deactivate"}`,
        access.token,
        undefined,
        "PUT",
      ),
    );
    if (!user.success || user.data.id !== id.data || user.data.isActive !== parsed.data.isActive)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el cambio de estado. Actualiza el listado antes de volver a intentarlo.",
      );
    const signedOut = user.data.id === access.user.id && !user.data.isActive;
    if (signedOut) await clearAuthCookies();
    return NextResponse.json({ user: user.data, signedOut });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
