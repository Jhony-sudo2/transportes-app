import { z } from "zod";

const RoleSchema = z.enum(["SYSTEM_ADMIN", "CONGRESS_ADMIN", "PARTICIPANT", "GUEST_SPEAKER"]);

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  organization: z.string(),
  phone: z.string(),
  personalId: z.string(),
  photoUrl: z.string().nullable().optional(),
  active: z.boolean(),
  roles: z.array(RoleSchema),
  linkedInstitutions: z.array(z.string().uuid()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const UserListSchema = z.object({
  items: z.array(UserSchema),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int().nonnegative().optional(),
});

export const CreateSystemAdminSchema = z.object({
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
  fullName: z.string().min(1, "El nombre completo es requerido"),
  organization: z.string().min(1, "La organizacion es requerida"),
  phone: z.string().min(1, "El telefono es requerido"),
  personalId: z
    .string()
    .min(1, "La identificacion es requerida")
    .regex(/^[a-zA-Z0-9]+$/, "La identificacion solo admite letras y numeros"),
});

export const CreateCongressAdminSchema = CreateSystemAdminSchema.extend({
  linkedInstitutions: z.array(z.string().uuid()).min(1, "Debe vincular al menos una institucion"),
});

export const CreateGuestSpeakerSchema = z.object({
  fullName: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("Correo electronico invalido"),
  organization: z.string().min(1, "La organizacion es requerida"),
  phone: z.string().min(1, "El telefono es requerido"),
  personalId: z
    .string()
    .min(1, "La identificacion es requerida")
    .regex(/^[a-zA-Z0-9]+$/, "La identificacion solo admite letras y numeros"),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  organization: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  photoUrl: z.string().url().optional(),
});

export type UserData = z.infer<typeof UserSchema>;
export type UserListData = z.infer<typeof UserListSchema>;
export type CreateSystemAdminData = z.infer<typeof CreateSystemAdminSchema>;
export type CreateCongressAdminData = z.infer<typeof CreateCongressAdminSchema>;
export type CreateGuestSpeakerData = z.infer<typeof CreateGuestSpeakerSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
