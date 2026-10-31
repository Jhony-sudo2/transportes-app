import { z } from "zod";
import { TransportUserSchema } from "./auth";
import {
  DriverListRecordSchema,
  DriverOperationIdSchema,
  DriverOperationSchema,
} from "./fleet-resources";

const required = z.string().trim().min(1, "Este campo es obligatorio");
export const AccountTwoFactorSchema = z.object({ twoFactorEnabled: z.boolean() }).strict();
export const AccountProfileRequestSchema = z
  .object({
    name: required.max(255),
    lastName: required.max(255),
    email: z.string().trim().email("Ingresa un correo válido").max(255),
    nit: required.max(50),
    phone: required.max(20),
    adress: required.max(100),
    dpi: z.string().trim().max(50),
    twoFactorEnabled: z.boolean().optional(),
  })
  .strict();
export const DriverProfileRequestSchema = AccountProfileRequestSchema.extend({
  twoFactorEnabled: z.never().optional(),
  dpi: required.max(50),
});
export const AccountPasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual").max(100),
    password: z
      .string()
      .min(6, "Usa al menos 6 caracteres")
      .max(20, "Usa como máximo 20 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña").max(20),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })
  .refine((data) => data.password !== data.currentPassword, {
    path: ["password"],
    message: "Elige una contraseña distinta a la actual",
  });
export const AccountDriverSchema = DriverListRecordSchema.extend({
  userId: z.number().int().positive(),
  photo: z.string(),
  dpi: z.string().nullish(),
  nit: z.string().nullish(),
  pendingOperationId: DriverOperationIdSchema.nullish(),
  updateFailureReason: z.string().nullish(),
});
export const AccountProfileSchema = z
  .object({
    user: TransportUserSchema,
    driver: AccountDriverSchema.nullable(),
  })
  .refine(
    ({ user, driver }) =>
      user.role.name === "DRIVER" ? driver !== null && driver.userId === user.id : driver === null,
    "No se pudo confirmar el perfil de esta cuenta.",
  );
export const AccountProfileOperationSchema = DriverOperationSchema.extend({
  action: z.literal("UPDATE"),
});
export type AccountProfile = z.infer<typeof AccountProfileSchema>;
export type AccountProfileRequest = z.infer<typeof AccountProfileRequestSchema>;
export type AccountPasswordRequest = z.infer<typeof AccountPasswordRequestSchema>;
