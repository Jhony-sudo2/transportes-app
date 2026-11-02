import { NextRequest, NextResponse } from "next/server";
import { requireAccountAccess } from "@/lib/api/account";
import { adminErrorResponse } from "@/lib/api/admin";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ detail: "Origen no permitido." }, { status: 403 });
  try {
    await requireAccountAccess();
    return NextResponse.json(
      { detail: "El alta de cajeros corresponde al administrador del sistema desde Usuarios." },
      { status: 403 },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
