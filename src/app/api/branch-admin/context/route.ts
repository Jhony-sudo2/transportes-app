import "server-only";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireBranchAdminAccess } from "@/lib/auth/branch-admin";
import { MANAGED_BRANCH_COOKIE } from "@/lib/auth/cookies";
import { adminErrorResponse } from "@/lib/api/admin";
import { fleetRequest } from "@/lib/api/fleet";
import {
  ManagedBranchChoiceSchema,
  ManagedBranchSelectionSchema,
  resolveManagedBranchId,
} from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";

export async function GET() {
  try {
    const { token, branchIds } = await requireBranchAdminAccess();
    const branches = await Promise.all(
      branchIds.map(async (id) => {
        const branch = ManagedBranchChoiceSchema.safeParse(
          await fleetRequest(`branches/${id}`, token),
        );
        if (!branch.success || branch.data.id !== id)
          throw new ApplicationError(
            "system.internal_error",
            502,
            "No se pudo cargar el nombre de una sucursal asignada.",
          );
        return branch.data;
      }),
    );
    const stored = (await cookies()).get(MANAGED_BRANCH_COOKIE)?.value;
    return NextResponse.json({
      branches,
      selectedBranchId: resolveManagedBranchId(branchIds, stored),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function PUT(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const { branchIds } = await requireBranchAdminAccess();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ detail: "Solicitud JSON inválida." }, { status: 400 });
    }
    const parsed = ManagedBranchSelectionSchema.safeParse(raw);
    if (!parsed.success)
      return NextResponse.json({ detail: "Selecciona una sucursal válida." }, { status: 400 });
    if (!branchIds.includes(parsed.data.branchId))
      throw new ApplicationError("auth.forbidden", 403, "No tienes asignada esta sucursal.");
    (await cookies()).set(MANAGED_BRANCH_COOKIE, String(parsed.data.branchId), {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
    });
    return NextResponse.json({ selectedBranchId: parsed.data.branchId });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
