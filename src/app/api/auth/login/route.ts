import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { transportRequest } from "@/lib/api/iam";
import { setAccessTokenCookie, clearAuthCookies } from "@/lib/auth/cookies";
import { TransportLoginRequestSchema, TransportLoginResponseSchema } from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      return NextResponse.json({ detail: "Origen no permitido." }, { status: 403 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = TransportLoginRequestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    const result = TransportLoginResponseSchema.parse(
      await transportRequest(parsed.data.code ? "auth/login/tfa" : "auth/login", {
        body: parsed.data,
      }),
    );
    if (result.resetPassword) {
      await clearAuthCookies();
      return NextResponse.json({
        status: "password_reset_required",
        detail:
          "Tu cuenta requiere cambiar la contraseña. Solicita un enlace desde «Olvidé mi contraseña».",
      });
    }
    if (!result.jwtToken && result.twoFactorEnabled) {
      await clearAuthCookies();
      return NextResponse.json({ status: "two_factor_required" });
    }
    if (!result.jwtToken || !result.user?.isActive)
      throw new ApplicationError(
        "auth.invalid_credentials",
        401,
        "No se recibió una sesión válida para una cuenta activa.",
      );
    await clearAuthCookies();
    await setAccessTokenCookie(result.jwtToken);
    return NextResponse.json({ status: "authenticated", redirect: "/" });
  } catch (error) {
    const status = error instanceof ApplicationError ? error.status : 502;
    return NextResponse.json(
      {
        detail:
          error instanceof ApplicationError
            ? error.message
            : "La respuesta del servicio no coincide con el contrato esperado.",
      },
      { status },
    );
  }
}
