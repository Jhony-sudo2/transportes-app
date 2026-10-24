import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireBranchAdminAccess } from "@/lib/auth/branch-admin";
import { MANAGED_BRANCH_COOKIE } from "@/lib/auth/cookies";
import { resolveManagedBranchId, ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";
export async function getBranchWorkspace() {
  const access = await requireBranchAdminAccess();
  const stored = (await cookies()).get(MANAGED_BRANCH_COOKIE)?.value;
  return { ...access, branchId: resolveManagedBranchId(access.branchIds, stored) };
}
export async function requireSelectedBranch(
  expected: unknown,
  workspace?: Awaited<ReturnType<typeof getBranchWorkspace>>,
) {
  const access = workspace ?? (await getBranchWorkspace());
  const parsed = ManagedBranchIdSchema.safeParse(expected);
  if (access.branchId === null)
    throw new ApplicationError(
      "validation.failed",
      400,
      "Selecciona una sucursal en la barra para continuar.",
    );
  if (!parsed.success || parsed.data !== access.branchId)
    throw new ApplicationError(
      "resource.conflict",
      409,
      "La sucursal seleccionada cambió. Revisa la sucursal e inténtalo nuevamente.",
    );
  return { ...access, branchId: access.branchId };
}
export function validatedFleetResult<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  raw: unknown,
  message = "No se pudo confirmar la respuesta. Verifica el registro antes de intentar crearlo otra vez.",
): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new ApplicationError("system.internal_error", 502, message);
  return result.data;
}
