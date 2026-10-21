import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { transportRequest } from "@/lib/api/iam";
import { TransportRegisterRequestSchema, TransportUserSchema } from "@/lib/validators/auth";
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
    const parsed = TransportRegisterRequestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    TransportUserSchema.parse(await transportRequest("auth/register", { body: parsed.data }));
    return NextResponse.json(
      { status: "registered", detail: "Cuenta creada correctamente. Ya puedes iniciar sesión." },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        detail:
          error instanceof ApplicationError
            ? error.message
            : "No se pudo confirmar la creación de la cuenta. Intenta iniciar sesión antes de repetir el registro.",
      },
      { status: error instanceof ApplicationError ? error.status : 502 },
    );
  }
}
