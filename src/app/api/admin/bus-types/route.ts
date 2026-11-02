import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import { validatedFleetResult } from "@/lib/api/branch-workspace";
import { BusTypeInputSchema, BusTypeListSchema, BusTypeSchema } from "@/lib/validators/bus-type";
import { ApplicationError } from "@/types/error";
export async function GET() {
  try {
    const { token } = await requireAdminAccess();
    return NextResponse.json(
      validatedFleetResult(BusTypeListSchema, await fleetRequest("bus-types", token)),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { token } = await requireAdminAccess();
    const raw: unknown = await request.json().catch(() => null);
    const parsed = BusTypeInputSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    const item = validatedFleetResult(
      BusTypeSchema,
      await fleetRequest("bus-types", token, parsed.data),
    );
    if (
      Object.entries(parsed.data).some(([key, value]) => item[key as keyof typeof item] !== value)
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "Actualiza el catálogo antes de repetir el alta; la respuesta no confirma los datos solicitados.",
      );
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
