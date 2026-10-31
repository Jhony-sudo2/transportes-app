import { NextRequest, NextResponse } from "next/server";
import { requireAccountAccess, accountIamRequest } from "@/lib/api/account";
import { adminErrorResponse } from "@/lib/api/admin";
import { validatedFleetResult } from "@/lib/api/branch-workspace";
import { AccountTwoFactorSchema } from "@/lib/validators/account";
import { TransportUserSchema } from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";

export async function GET() {
  try {
    const { user } = await requireAccountAccess();
    return NextResponse.json({ twoFactorEnabled: user.twoFactorEnabled });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { user, token } = await requireAccountAccess();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = AccountTwoFactorSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Indica si deseas activar o desactivar el 2FA.",
      );
    // El endpoint de User alterna el estado. Si ya coincide, no lo invocamos.
    if (user.twoFactorEnabled === parsed.data.twoFactorEnabled)
      return NextResponse.json({ twoFactorEnabled: user.twoFactorEnabled });
    const unconfirmed =
      "No se pudo confirmar el cambio de 2FA. Consulta su estado antes de volver a intentarlo.";
    const updated = validatedFleetResult(
      TransportUserSchema,
      await accountIamRequest("users/profile/two-factor", token, undefined, "PATCH"),
      unconfirmed,
    );
    if (
      updated.id !== user.id ||
      updated.role.name !== user.role.name ||
      updated.twoFactorEnabled !== parsed.data.twoFactorEnabled
    )
      throw new ApplicationError("system.internal_error", 502, unconfirmed);
    return NextResponse.json({ twoFactorEnabled: updated.twoFactorEnabled });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
