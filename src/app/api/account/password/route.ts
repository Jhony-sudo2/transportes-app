import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAccountAccess, accountIamRequest } from "@/lib/api/account";
import { adminErrorResponse } from "@/lib/api/admin";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { AccountPasswordRequestSchema } from "@/lib/validators/account";
import { ApplicationError } from "@/types/error";

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const access = await requireAccountAccess();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = AccountPasswordRequestSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 },
      );
    const result = await accountIamRequest(
      "users/profile/password",
      access.token,
      parsed.data,
      "POST",
    );
    if (result !== null)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el cambio. Intenta iniciar sesión antes de repetirlo.",
      );
    await clearAuthCookies();
    return NextResponse.json({
      status: "changed",
      detail: "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
