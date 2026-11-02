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
  id: z.number().int().positive().safe(),
  email: z.string().email(),
  emailVerified: z.boolean().optional(),
  role: z.object({
    id: z.number().int(),
    name: z
      .enum(["ADMIN", "SUCURSAL_ADMIN", "CUSTOMER", "DRIVER", "CAJERO", "CASHIER"])
      .transform((role) => (role === "CASHIER" ? ("CAJERO" as const) : role)),
  }),
  isActive: z.boolean(),
  name: z.string(),
  lastName: z.string(),
  phone: z.string().nullish(),
  nit: z.string().nullish(),
  dpi: z.string().nullish(),
  adress: z.string().nullish(),
  twoFactorEnabled: z.boolean(),
  resetPassword: z.boolean(),
  branchIds: z.array(z.number().int().positive().safe()).nullish(),
  customerId: z.number().int().positive().safe().nullish(),
});
// Identity uses address; the existing UI model retains adress.
export const TransportProfileResponseSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  return { ...raw, ...("address" in raw ? { adress: raw.address } : {}) };
}, TransportUserSchema);
export const TransportLoginRequestSchema = LoginRequestSchema.extend({
  email: z.string().trim().email("Correo electrónico inválido").max(255),
  password: z.string().min(1, "La contraseña es requerida").max(100),
}).strict();
export const TransportTfaRequestSchema = z
  .object({
    challengeId: z.string().min(1).max(8192),
    code: z.string().trim().min(1, "Ingresa el código").max(10),
  })
  .strict();
export const TransportAuthRequestSchema = z.union([
  TransportLoginRequestSchema,
  TransportTfaRequestSchema,
]);
export const TransportAccessResponseSchema = z.object({
  accessToken: z.string().min(1),
  challengeId: z.never().optional(),
  requires2FA: z.literal(false).optional(),
});
export const TransportLoginResponseSchema = z.union([
  TransportAccessResponseSchema,
  z.object({
    challengeId: z.string().min(1).max(8192),
    requires2FA: z.literal(true),
    accessToken: z.never().optional(),
  }),
]);

const transportRequiredText = z.string().trim().min(1, "Este campo es requerido");
export const TransportRegisterRequestSchema = z
  .object({
    person: z
      .object({
        name: transportRequiredText.max(150),
        lastName: transportRequiredText.max(150),
        dpi: transportRequiredText.max(32),
        nit: transportRequiredText
          .max(50)
          .refine(
            (value) => value.toUpperCase() !== "CF",
            "Ingresa tu NIT personal; CF está reservado para compras presenciales",
          ),
        phone: transportRequiredText.max(20),
        adress: transportRequiredText.max(100),
      })
      .strict(),
    credentials: z
      .object({
        email: z.string().trim().email("Correo electrónico inválido").max(254),
        password: z.string().min(12, "Usa al menos 12 caracteres").max(100),
        confirmPassword: z.string().min(1, "Confirma tu contraseña").max(100),
      })
      .strict()
      .refine((data) => data.password === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
      }),
  })
  .strict();

export const TransportRegisterResponseSchema = z.object({
  userId: z.number().int().positive().safe(),
  customerId: z.number().int().positive().safe(),
  emailVerificationRequired: z.literal(true),
});
export const TransportRegisterUiResponseSchema = z.object({
  status: z.literal("registered"),
  emailVerificationRequired: z.literal(true),
});
// Tokens de email opacos: no se presupone que sean JWT ni se inspecciona su contenido.
export const IdentityEmailTokenSchema = z
  .object({ token: z.string().min(1, "Abre el enlace que recibiste por correo").max(8192) })
  .strict();
export const IdentityEmailRequestSchema = z
  .object({ email: z.string().trim().email("Ingresa un correo válido").max(254) })
  .strict();
export const IdentityEmailConfirmedSchema = z.object({ emailVerified: z.literal(true) });
export const IdentityEmailAcceptedSchema = z.object({ accepted: z.literal(true) });
export const IdentityEmailPendingSchema = z.object({ verificationPending: z.literal(true) });
export const TransportLoginUiResponseSchema = z.union([
  z.object({ status: z.literal("authenticated"), redirect: z.literal("/") }),
  z.object({ status: z.literal("two_factor_required"), challengeId: z.string().min(1).max(8192) }),
  z.object({ status: z.literal("password_reset_required"), detail: z.string() }),
]);

export const TransportForgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido").max(255),
});
export const TransportPasswordTokenSchema = z
  .string()
  .trim()
  .min(1, "Abre el enlace que recibiste por correo")
  .max(8192);
export const TransportResetPasswordSchema = z
  .object({
    token: TransportPasswordTokenSchema,
    password: z
      .string()
      .min(12, "Usa al menos 12 caracteres")
      .max(100, "Usa como máximo 100 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la contraseña").max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
