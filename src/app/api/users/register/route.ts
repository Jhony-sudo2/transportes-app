import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { transportRequest } from "@/lib/api/iam";
import {
  TransportRegisterRequestSchema,
  TransportRegisterResponseSchema,
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
    const parsed = TransportRegisterRequestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { detail: parsed.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    const { person, credentials } = parsed.data;
    TransportRegisterResponseSchema.parse(
      await transportRequest("auth/register", {
        body: {
          nit: person.nit,
          dpi: person.dpi,
          name: person.name,
          lastName: person.lastName,
          phone: person.phone,
          address: person.adress,
          email: credentials.email,
          password: credentials.password,
        },
      }),
    );
    return NextResponse.json(
      {
        status: "registered",
        emailVerificationRequired: true,
        detail:
          "Cuenta creada. Confirma tu correo desde el enlace que recibirás antes de iniciar sesión.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApplicationError) return applicationErrorResponse(error);
    return NextResponse.json(
      {
        detail:
          "No se pudo confirmar la creación de la cuenta. Revisa tu correo o solicita un enlace de verificación antes de repetir el registro.",
      },
      { status: 502 },
    );
  }
}
