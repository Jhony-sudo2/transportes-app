import { NextRequest, NextResponse } from "next/server";
import { transportRequest } from "@/lib/api/iam";
import { adminErrorResponse } from "@/lib/api/admin";
import {
  IdentityEmailTokenSchema,
  IdentityEmailRequestSchema,
  IdentityEmailConfirmedSchema,
  IdentityEmailAcceptedSchema,
} from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { action } = await context.params;
    if (!["confirm", "resend", "confirm-change"].includes(action))
      throw new ApplicationError("resource.not_found", 404, "Operación no disponible.");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = (
      action === "resend" ? IdentityEmailRequestSchema : IdentityEmailTokenSchema
    ).safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Ingresa un correo o enlace de verificación válido.",
      );
    const path =
      action === "resend"
        ? "auth/email-verification/resend"
        : action === "confirm"
          ? "auth/email-confirm"
          : "users/profile/email-confirm";
    const result = await transportRequest(path, { body: parsed.data });
    // Ninguno de estos resultados inicia sesión ni atribuye compras por email.
    return NextResponse.json(
      (action === "resend" ? IdentityEmailAcceptedSchema : IdentityEmailConfirmedSchema).parse(
        result,
      ),
    );
  } catch (error) {
    return error instanceof ApplicationError
      ? adminErrorResponse(error)
      : NextResponse.json(
          {
            detail:
              "No se pudo confirmar la respuesta. Revisa el enlace o solicita otro correo de verificación.",
          },
          { status: 502 },
        );
  }
}
