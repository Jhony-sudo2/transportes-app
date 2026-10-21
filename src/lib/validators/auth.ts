import { z } from "zod";
import { UserSchema } from "@/lib/validators/user";

export const LoginRequestSchema = z.object({
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(1, "La contrasena es requerida"),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
  fullName: z.string().min(1, "El nombre completo es requerido"),
  organization: z.string().min(1, "La organizacion es requerida"),
  phone: z.string().min(1, "El telefono es requerido"),
  personalId: z
    .string()
    .min(1, "El DPI o identificacion es requerido")
    .regex(/^[a-zA-Z0-9]+$/, "La identificacion solo admite letras y numeros"),
  photoUrl: z.string().url("URL de foto invalida").optional(),
});

// Used by POST /auth/login and POST /users/register — IAM returns tokens + user profile.
export const IamAuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: UserSchema,
});

// Used by POST /auth/refresh — IAM only returns a new access token.
export const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
});

// Legacy alias kept for the mock (mock still returns { accessToken, refreshToken }).
export const AuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const SessionSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  roles: z.array(z.enum(["SYSTEM_ADMIN", "CONGRESS_ADMIN", "PARTICIPANT", "GUEST_SPEAKER"])),
  exp: z.number(),
  iat: z.number(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type IamAuthResponseData = z.infer<typeof IamAuthResponseSchema>;
export type RefreshResponseData = z.infer<typeof RefreshResponseSchema>;
export type AuthResponseData = z.infer<typeof AuthResponseSchema>;
export type SessionData = z.infer<typeof SessionSchema>;

// Transportes Guatemala: contratos independientes del dominio anterior.
export const TransportUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: z.object({
    id: z.number().int(),
    name: z.enum(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "DRIVER"]),
  }),
  isActive: z.boolean(),
  name: z.string(),
  lastName: z.string(),
  twoFactorEnabled: z.boolean(),
  resetPassword: z.boolean(),
  branchIds: z.array(z.number().int()).nullish(),
  customerId: z.number().int().nullish(),
});
export const TransportLoginRequestSchema = LoginRequestSchema.extend({
  email: z.string().trim().email("Correo electrónico inválido").max(255),
  password: z.string().min(1, "La contraseña es requerida").max(100),
  code: z.string().trim().min(1, "Ingresa el código").max(10).optional(),
});
export const TransportLoginResponseSchema = z.object({
  twoFactorEnabled: z.boolean().nullable(),
  user: TransportUserSchema.nullable(),
  jwtToken: z.string().min(1).nullable(),
  resetPassword: z.boolean(),
});
export type TransportUser = z.infer<typeof TransportUserSchema>;
export type TransportLoginRequest = z.infer<typeof TransportLoginRequestSchema>;

const transportRequiredText = z.string().trim().min(1, "Este campo es requerido");
export const TransportRegisterRequestSchema = z.object({
  person: z.object({
    name: transportRequiredText.max(255),
    lastName: transportRequiredText.max(255),
    dpi: transportRequiredText.max(50),
    nit: transportRequiredText.max(50),
    phone: transportRequiredText.max(20),
    adress: transportRequiredText.max(100),
  }),
  credentials: z
    .object({
      email: z.string().trim().email("Correo electrónico inválido").max(255),
      password: z.string().min(8, "Usa al menos 8 caracteres").max(100),
      confirmPassword: z.string().min(1, "Confirma tu contraseña").max(100),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    }),
});
export type TransportRegisterRequest = z.infer<typeof TransportRegisterRequestSchema>;

export const TransportForgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido").max(255),
});
export const TransportResetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, "Abre el enlace de recuperación de tu correo")
      .max(8192)
      .regex(
        /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
        "El token de recuperación no es válido",
      ),
    password: z
      .string()
      .min(6, "Usa al menos 6 caracteres")
      .max(20, "Usa como máximo 20 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la contraseña").max(20),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
export type TransportForgotPassword = z.infer<typeof TransportForgotPasswordSchema>;
export type TransportResetPassword = z.infer<typeof TransportResetPasswordSchema>;
