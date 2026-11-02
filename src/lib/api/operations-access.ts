import "server-only";
import type { NextRequest } from "next/server";
import type { TransportRoleName } from "@/types/auth";
import { ApplicationError } from "@/types/error";
import { requireAccountAccess } from "./account";
import { requireSelectedBranch } from "./branch-workspace";
import { serviceResult, transportService } from "./transport-service";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { BranchSchema } from "@/lib/validators/branch";
export async function operationsAccess(
  request: NextRequest,
  roles: TransportRoleName[],
  branch = false,
) {
  const access = await requireAccountAccess();
  if (!roles.includes(access.user.role.name))
    throw new ApplicationError("auth.forbidden", 403, "Tu rol no tiene acceso a esta operación.");
  let branchId: number | undefined;
  if (branch && access.user.role.name === "SUCURSAL_ADMIN")
    branchId = (await requireSelectedBranch(Number(request.nextUrl.searchParams.get("branchId"))))
      .branchId;
  if (branch && access.user.role.name === "CAJERO") {
    const ids = serviceResult(
      ManagedBranchIdSchema.array(),
      await transportService(`users/${access.user.id}/branches`, access),
    );
    if (ids.length !== 1 || !ids[0])
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "Tu cuenta debe tener una única sucursal asignada.",
      );
    branchId = ids[0];
    const selected = request.nextUrl.searchParams.get("branchId");
    if (selected && Number(selected) !== branchId)
      throw new ApplicationError("auth.forbidden", 403, "No puedes operar en otra sucursal.");
  }
  if (branchId !== undefined) {
    const sede = serviceResult(
      BranchSchema,
      await transportService(`branches/${branchId}`, access),
    );
    if (sede.id !== branchId || sede.active !== true)
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "La sucursal no está habilitada para operar.",
      );
  }
  return { ...access, ...(branchId === undefined ? {} : { branchId }) };
}
