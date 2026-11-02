import { z } from "zod";
import { BranchSchema } from "./branch";

export const ManagedBranchIdSchema = z.number().int().positive().safe();
export const ManagedBranchSelectionSchema = z.object({ branchId: ManagedBranchIdSchema });
export const ManagedBranchChoiceSchema = z.object({
  id: ManagedBranchIdSchema,
  name: z.string().trim().min(1),
});
export const OperationalBranchSchema = BranchSchema.pipe(
  z
    .object({
      id: ManagedBranchIdSchema,
      name: z.string().trim().min(1),
      active: z.boolean(),
    })
    .strip(),
);
export const PublicBranchCatalogSchema = z.array(
  z
    .object({ branchId: ManagedBranchIdSchema, name: z.string().trim().min(1) })
    .strip()
    .transform(({ branchId, name }) => ({ id: branchId, name })),
);
export const ManagedBranchContextSchema = z
  .object({
    branches: z.array(ManagedBranchChoiceSchema),
    selectedBranchId: ManagedBranchIdSchema.nullable(),
  })
  .refine(
    ({ branches, selectedBranchId }) =>
      selectedBranchId === null || branches.some((branch) => branch.id === selectedBranchId),
    { message: "La sucursal seleccionada no está asignada a esta cuenta." },
  );
export const ManagedBranchSelectionResponseSchema = z.object({
  selectedBranchId: ManagedBranchIdSchema,
});

export function resolveManagedBranchId(branchIds: number[], stored?: string): number | null {
  const parsed = ManagedBranchIdSchema.safeParse(Number(stored));
  if (parsed.success && branchIds.includes(parsed.data)) return parsed.data;
  return branchIds.length === 1 ? (branchIds[0] ?? null) : null;
}
