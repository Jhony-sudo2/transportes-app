import "server-only";
import { NextResponse } from "next/server";
import { requireAdminAccess, adminRequest, adminErrorResponse } from "@/lib/api/admin";
import { AdminRoleListSchema, isCreatableRole } from "@/lib/validators/admin-user";
import { ApplicationError } from "@/types/error";
export async function GET() {
  try {
    const { token } = await requireAdminAccess();
    const parsed = AdminRoleListSchema.safeParse(await adminRequest("roles", token));
    if (!parsed.success)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "El catálogo de roles no tiene el formato esperado.",
      );
    return NextResponse.json(parsed.data.filter(isCreatableRole));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
