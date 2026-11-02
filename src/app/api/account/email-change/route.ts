import { NextRequest, NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/api/account";
import { transportRequest } from "@/lib/api/iam";
import { adminErrorResponse } from "@/lib/api/admin";
import { IdentityEmailRequestSchema, IdentityEmailPendingSchema } from "@/lib/validators/auth";
import { ApplicationError } from "@/types/error";

export async function POST(request: NextRequest) {
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
    const parsed = IdentityEmailRequestSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Ingresa únicamente el nuevo correo electrónico.",
      );
    if (parsed.data.email.toLowerCase() === user.email.toLowerCase())
      throw new ApplicationError(
        "validation.failed",
        400,
        "Ingresa un correo diferente al actual.",
      );
    return NextResponse.json(
      IdentityEmailPendingSchema.parse(
        await transportRequest("users/profile/email-change", { token, body: parsed.data }),
      ),
    );
  } catch (error) {
    return error instanceof ApplicationError
      ? adminErrorResponse(error)
      : NextResponse.json(
          {
            detail:
              "No se pudo confirmar la solicitud. El correo actual se conserva hasta verificar la nueva dirección.",
          },
          { status: 502 },
        );
  }
}
