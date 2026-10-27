import { z } from "zod";
import { TransportRegisterRequestSchema, TransportUserSchema } from "./auth";
import { ManagedBranchIdSchema } from "./branch-context";
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador del sistema",
  CUSTOMER: "Cliente",
  SUCURSAL_ADMIN: "Administrador de sucursal",
  CAJERO: "Cajero",
  CASHIER: "Cajero",
};
export const CreatableRoleSchema = z
  .number()
  .int()
  .refine(
    (id) => [1, 2, 3, 5].includes(id),
    "Selecciona un rol válido; los choferes se registran desde Fleet",
  );
export const AdminRoleSchema = z.object({
  id: z.number().int().positive(),
  name: z.enum(["ADMIN", "CUSTOMER", "SUCURSAL_ADMIN", "DRIVER", "CAJERO", "CASHIER"]),
});
export const AdminRoleListSchema = z.array(AdminRoleSchema);
export const CreateAdminUserSchema = z.object({
  person: TransportRegisterRequestSchema.shape.person,
  email: z.string().trim().email("Correo electrónico inválido").max(255),
  roleId: CreatableRoleSchema,
});
export const CreatedAdminUserSchema = TransportUserSchema.pick({
  id: true,
  name: true,
  lastName: true,
  email: true,
  role: true,
});
export const CreateBranchCashierSchema = CreateAdminUserSchema.pick({
  person: true,
  email: true,
})
  .extend({ branchId: ManagedBranchIdSchema })
  .strict();
export type CreateAdminUser = z.infer<typeof CreateAdminUserSchema>;
export type AdminRole = z.infer<typeof AdminRoleSchema>;
export type CreatedAdminUser = z.infer<typeof CreatedAdminUserSchema>;
export function isCreatableRole(role: AdminRole): boolean {
  return CreatableRoleSchema.safeParse(role.id).success && role.name !== "DRIVER";
}
