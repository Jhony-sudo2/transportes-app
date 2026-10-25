import "server-only";
import {
  getBranchWorkspace,
  requireSelectedBranch,
  validatedFleetResult,
} from "@/lib/api/branch-workspace";
import { fleetRequest } from "@/lib/api/fleet";
import { DriverListSchema } from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";

export async function getManagedDriver(
  id: number,
  expectedBranch: unknown,
  workspace?: Awaited<ReturnType<typeof getBranchWorkspace>>,
) {
  const access = await requireSelectedBranch(expectedBranch, workspace);
  const drivers = validatedFleetResult(
    DriverListSchema,
    await fleetRequest(`branches/${access.branchId}/drivers`, access.token),
  );
  const driver = drivers.find((record) => record.id === id);
  if (!driver)
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "El chofer no pertenece a la sucursal seleccionada.",
    );
  return { ...access, driver };
}
