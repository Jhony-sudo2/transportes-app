import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, adminRequest } from "@/lib/api/admin";
import {
  getBranchWorkspace,
  requireSelectedBranch,
  validatedFleetResult,
} from "@/lib/api/branch-workspace";
import { CreateBranchCashierSchema, CreatedAdminUserSchema } from "@/lib/validators/admin-user";
import { ApplicationError } from "@/types/error";

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const workspace = await getBranchWorkspace();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = CreateBranchCashierSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    const { token, branchId } = await requireSelectedBranch(parsed.data.branchId, workspace);
    const user = validatedFleetResult(
      CreatedAdminUserSchema,
      await adminRequest("users/cashiers", token, {
        userCreate: { person: parsed.data.person, email: parsed.data.email, roleId: 5 },
        branchId,
      }),
    );
    if (user.role.id !== 5 || user.role.name !== "CAJERO" || user.email !== parsed.data.email)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el alta del cajero. Verifica la cuenta antes de repetirla.",
      );
    return NextResponse.json({ status: "created", user, branchId }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
