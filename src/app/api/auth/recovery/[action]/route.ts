import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { transportRequest } from "@/lib/api/iam";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { TransportForgotPasswordSchema, TransportResetPasswordSchema } from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";
import { applicationErrorResponse } from "@/lib/api/responses";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
): Promise<NextResponse> {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      return NextResponse.json({ detail: "Origen no permitido." }, { status: 403 });
    const { action } = await context.params;
    if (action !== "forgot" && action !== "reset")
      return NextResponse.json({ detail: "Operación desconocida." }, { status: 404 });
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    if (action === "forgot") {
      const parsed = TransportForgotPasswordSchema.safeParse(raw);
      if (!parsed.success)
        return NextResponse.json(
          { detail: "Ingresa un correo electrónico válido." },
          { status: 400 },
        );
      const result = await transportRequest("auth/forgot-password", { body: parsed.data });
      if (result !== null)
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se pudo confirmar la solicitud de recuperación.",
        );
      return NextResponse.json({
        status: "sent",
        detail:
          "Si el correo corresponde a una cuenta, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.",
      });
    }
    const parsed = TransportResetPasswordSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    const { token, password, confirmPassword } = parsed.data;
    const result = await transportRequest("users/reset-password", {
      body: { token, password, confirmPassword },
    });
    if (result !== null)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el cambio. Intenta iniciar sesión antes de repetirlo.",
      );
    await clearAuthCookies();
    return NextResponse.json({
      status: "reset",
      detail: "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
    });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return NextResponse.json(
      {
        detail:
          error instanceof ApplicationError
            ? error.message
            : "No se pudo confirmar la operación. Intenta iniciar sesión o solicita un nuevo enlace.",
      },
      { status: error instanceof ApplicationError ? error.status : 502 },
    );
  }
}
