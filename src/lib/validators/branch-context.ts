import { z } from "zod";

export const ManagedBranchIdSchema = z.number().int().positive().safe();
export const ManagedBranchSelectionSchema = z.object({ branchId: ManagedBranchIdSchema });
export const ManagedBranchChoiceSchema = z.object({
  id: ManagedBranchIdSchema,
  name: z.string().trim().min(1),
});
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
export type ManagedBranchContext = z.infer<typeof ManagedBranchContextSchema>;

export function resolveManagedBranchId(branchIds: number[], stored?: string): number | null {
  const parsed = ManagedBranchIdSchema.safeParse(Number(stored));
  if (parsed.success && branchIds.includes(parsed.data)) return parsed.data;
  return branchIds.length === 1 ? (branchIds[0] ?? null) : null;
}
