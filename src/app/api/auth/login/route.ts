import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { transportRequest } from "@/lib/api/iam";
import { setAccessTokenCookie, clearAuthCookies } from "@/lib/auth/cookies";
import {
  TransportAuthRequestSchema,
  TransportLoginResponseSchema,
  TransportAccessResponseSchema,
  TransportProfileResponseSchema as TransportUserSchema,
} from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";
import { applicationErrorResponse } from "@/lib/api/responses";
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
    const parsed = TransportAuthRequestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    const isTfa = "challengeId" in parsed.data;
    const result = (isTfa ? TransportAccessResponseSchema : TransportLoginResponseSchema).parse(
      await transportRequest(isTfa ? "auth/login/tfa" : "auth/login", {
        body: parsed.data,
      }),
    );
    if ("challengeId" in result && result.challengeId) {
      await clearAuthCookies();
      return NextResponse.json({ status: "two_factor_required", challengeId: result.challengeId });
    }
    const accessToken = TransportAccessResponseSchema.parse(result).accessToken;
    // La forma de perfil compatible se conserva; nunca se crea sesión por un mero desafío.
    const user = TransportUserSchema.parse(
      await transportRequest("users/profile", { token: accessToken }),
    );
    if (user.resetPassword) {
      await clearAuthCookies();
      return NextResponse.json({
        status: "password_reset_required",
        detail:
          "Tu cuenta requiere cambiar la contraseña. Solicita un enlace desde «Olvidé mi contraseña».",
      });
    }
    if (!user.isActive)
      throw new ApplicationError(
        "auth.invalid_credentials",
        401,
        "No se recibió una sesión válida para una cuenta activa.",
      );
    await clearAuthCookies();
    await setAccessTokenCookie(accessToken);
    return NextResponse.json({ status: "authenticated", redirect: "/" });
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return NextResponse.json(
      {
        detail:
          "No se pudo verificar la respuesta de acceso. Inténtalo nuevamente cuando el servicio esté disponible.",
      },
      { status: 502 },
    );
  }
}
