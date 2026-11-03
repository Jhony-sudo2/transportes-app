import { z } from "zod";
import type { AdminRole, StaffCreatedResponse } from "@/types/admin-user";
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
    (id) => [1, 3, 5].includes(id),
    "Selecciona un rol válido; los choferes se registran desde la flota",
  );
export const AdminRoleSchema = z.object({
  id: z.number().int().positive(),
  name: z.enum(["ADMIN", "CUSTOMER", "SUCURSAL_ADMIN", "DRIVER", "CAJERO", "CASHIER"]),
});
export const AdminRoleListSchema = z.array(AdminRoleSchema);
export const CreateAdminUserSchema = z.object({
  person: TransportRegisterRequestSchema.shape.person,
  email: z.string().trim().email("Correo electrónico inválido").max(254),
  roleId: CreatableRoleSchema,
  branchIds: z.array(ManagedBranchIdSchema).default([]),
});
export const CreateStaffUserSchema = CreateAdminUserSchema.strict().superRefine((data, context) => {
  if ([3, 5].includes(data.roleId) && data.branchIds.length === 0)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["branchIds"],
      message: "Asigna al menos una sucursal al usuario.",
    });
  if (data.roleId === 5 && data.branchIds.length !== 1)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["branchIds"],
      message: "Selecciona una única sucursal para el cajero.",
    });
  if (new Set(data.branchIds).size !== data.branchIds.length)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["branchIds"],
      message: "No repitas sucursales.",
    });
});
const roleIds = { ADMIN: 1, CUSTOMER: 2, SUCURSAL_ADMIN: 3, DRIVER: 4, CASHIER: 5 } as const;
export const StaffRoleSchema = z.enum(["ADMIN", "CUSTOMER", "SUCURSAL_ADMIN", "DRIVER", "CASHIER"]);
export const StaffCreatedSchema = z.object({
  userId: ManagedBranchIdSchema,
  role: StaffRoleSchema,
  branchIds: z.array(ManagedBranchIdSchema),
}) satisfies z.ZodType<StaffCreatedResponse, z.ZodTypeDef, unknown>;
export const StaffUserSchema = StaffCreatedSchema.extend({
  name: z.string().nullish(),
  lastName: z.string().nullish(),
  email: z.string().email().nullish(),
  active: z.boolean(),
}).transform((user) => ({
  id: user.userId,
  name: user.name ?? "",
  lastName: user.lastName ?? "",
  email: user.email ?? "",
  isActive: user.active,
  branchIds: user.branchIds,
  role: { id: roleIds[user.role], name: user.role === "CASHIER" ? ("CAJERO" as const) : user.role },
}));
export const CreatedAdminUserSchema = TransportUserSchema.pick({
  id: true,
  name: true,
  lastName: true,
  email: true,
  role: true,
});
export const AdminUserSchema = CreatedAdminUserSchema.extend({
  email: z.union([z.string().email(), z.literal("")]),
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
  role: StaffRoleSchema.optional(),
  active: z.enum(["true", "false"]).optional(),
  branchId: z.coerce.number().int().positive().safe().optional(),
});
export const StaffUserResultSchema = z.union([StaffUserSchema, AdminUserSchema]);
export const StaffUsersPageSchema = AdminUsersPageSchema.extend({
  content: z.array(StaffUserResultSchema),
});
export const StaffUserListSchema = z.array(StaffUserSchema);
export const AssignAdminBranchSchema = z.object({ branchId: ManagedBranchIdSchema }).strict();
export const AdminBranchIdsSchema = z.array(ManagedBranchIdSchema);
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
export function isCreatableRole(role: AdminRole): boolean {
  return CreatableRoleSchema.safeParse(role.id).success && role.name !== "DRIVER";
}
