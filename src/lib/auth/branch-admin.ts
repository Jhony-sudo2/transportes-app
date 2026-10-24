import "server-only";
import { cookies } from "next/headers";
import { getTransportSession } from "@/lib/auth/session";
import { ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import { ApplicationError } from "@/types/error";

export async function requireBranchAdminAccess() {
  const user = await getTransportSession();
  if (!user || !user.isActive)
    throw new ApplicationError("auth.token_invalid", 401, "Inicia sesión para continuar.");
  if (user.role.name !== "SUCURSAL_ADMIN" || user.resetPassword)
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "Se requiere una cuenta de administrador de sucursales.",
    );
  const token = (await cookies()).get("access_token")?.value;
  if (!token)
    throw new ApplicationError("auth.token_invalid", 401, "Inicia sesión para continuar.");
  const branchIds = [...new Set(user.branchIds ?? [])].filter(
    (id) => ManagedBranchIdSchema.safeParse(id).success,
  );
  return { user, token, branchIds };
}
