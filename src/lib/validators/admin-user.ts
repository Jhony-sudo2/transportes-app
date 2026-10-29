import { z } from "zod";
import { TransportRegisterRequestSchema, TransportUserSchema } from "./auth";
import { ManagedBranchIdSchema } from "./branch-context";
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador del sistema",
  CUSTOMER: "Cliente",
  DRIVER: "Conductor",
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
export const AdminUserSchema = CreatedAdminUserSchema.extend({
  isActive: z.boolean(),
  branchIds: z.array(ManagedBranchIdSchema).nullish(),
});
export const AdminUsersPageSchema = z.object({
  content: z.array(AdminUserSchema),
  page: z.number().int().nonnegative().safe(),
  size: z.number().int().positive().safe(),
  totalElements: z.number().int().nonnegative().safe(),
  totalPages: z.number().int().nonnegative().safe(),
});
export const AdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(0).max(2147483647).default(0),
  email: z.string().trim().max(255).default(""),
});
export const AssignAdminBranchSchema = z.object({ branchId: ManagedBranchIdSchema }).strict();
export const AdminBranchIdsSchema = z.array(ManagedBranchIdSchema);
export type AdminUser = z.infer<typeof AdminUserSchema>;
export const AdminUserAvailabilitySchema = z.object({ isActive: z.boolean() }).strict();
export const AdminUserAvailabilityResponseSchema = z.object({
  user: AdminUserSchema,
  signedOut: z.boolean(),
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
