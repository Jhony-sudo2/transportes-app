import "server-only";
import { ApplicationError } from "@/types/error";

import { z } from "zod";
import { apiFetch, apiResponseOf } from "./client";
import {
  IamAuthResponseSchema,
  RefreshResponseSchema,
  type IamAuthResponseData,
  type RefreshResponseData,
  type LoginRequest,
  type RegisterRequest,
} from "@/lib/validators/auth";
import {
  UserSchema,
  UserListSchema,
  type UserData,
  type UserListData,
} from "@/lib/validators/user";

// All traffic goes through the API Gateway at :8080, which load-balances to lb://iam-service.
// The gateway strips nothing — paths passed here must include the /api/v1 prefix.
const GATEWAY = process.env["GATEWAY_URL"] ?? "http://localhost:8080";
const BASE = `${GATEWAY}/api/v1`;

// --- Auth ---

export async function loginUser(data: LoginRequest): Promise<IamAuthResponseData> {
  return apiFetch(`${BASE}/auth/login`, apiResponseOf(IamAuthResponseSchema), {
    method: "POST",
    body: data,
  });
}

// IAM requires the refresh token in the request body to invalidate it on the server.
export async function logoutUser(accessToken: string, refreshToken: string): Promise<void> {
  await apiFetch(`${BASE}/auth/logout`, apiResponseOf(z.unknown()), {
    method: "POST",
    token: accessToken,
    body: { refreshToken },
  });
}

export async function refreshToken(token: string): Promise<RefreshResponseData> {
  return apiFetch(`${BASE}/auth/refresh`, apiResponseOf(RefreshResponseSchema), {
    method: "POST",
    body: { refreshToken: token },
  });
}

// --- Users ---

export async function registerParticipant(data: RegisterRequest): Promise<IamAuthResponseData> {
  return apiFetch(`${BASE}/users/register`, apiResponseOf(IamAuthResponseSchema), {
    method: "POST",
    body: data,
  });
}

export async function getMe(token: string): Promise<UserData> {
  return apiFetch(`${BASE}/users/me`, apiResponseOf(UserSchema), { token });
}

export async function getUserById(id: string, token: string): Promise<UserData> {
  return apiFetch(`${BASE}/users/${id}`, apiResponseOf(UserSchema), { token });
}

export async function updateUser(id: string, data: unknown, token: string): Promise<UserData> {
  return apiFetch(`${BASE}/users/${id}`, apiResponseOf(UserSchema), {
    method: "PUT",
    body: data,
    token,
  });
}

export async function deactivateUser(id: string, token: string): Promise<void> {
  await apiFetch(`${BASE}/users/${id}/deactivate`, apiResponseOf(z.unknown()), {
    method: "PATCH",
    token,
  });
}

export async function activateUser(id: string, token: string): Promise<void> {
  await apiFetch(`${BASE}/users/${id}/activate`, apiResponseOf(z.unknown()), {
    method: "PATCH",
    token,
  });
}

export async function listUsers(token: string, params: URLSearchParams): Promise<UserListData> {
  return apiFetch(`${BASE}/users?${params.toString()}`, apiResponseOf(UserListSchema), { token });
}

export async function createSystemAdmin(data: unknown, token: string): Promise<UserData> {
  return apiFetch(`${BASE}/users/system-admins`, apiResponseOf(UserSchema), {
    method: "POST",
    body: data,
    token,
  });
}

export async function createCongressAdmin(data: unknown, token: string): Promise<UserData> {
  return apiFetch(`${BASE}/users/congress-admins`, apiResponseOf(UserSchema), {
    method: "POST",
    body: data,
    token,
  });
}

export async function createGuestSpeaker(data: unknown, token: string): Promise<UserData> {
  return apiFetch(`${BASE}/users/guest-speakers`, apiResponseOf(UserSchema), {
    method: "POST",
    body: data,
    token,
  });
}

// IAM returns { eligible: boolean }; we map to the name used across the frontend.
export async function canBeCommitteeMember(
  id: string,
  token: string,
): Promise<{ canBeCommittee: boolean }> {
  // The transform changes the input shape — cast keeps strict tsconfig happy.
  const schema = z
    .object({ eligible: z.boolean() })
    .transform((r) => ({ canBeCommittee: r.eligible })) as unknown as z.ZodSchema<{
    canBeCommittee: boolean;
  }>;
  return apiFetch(`${BASE}/users/${id}/can-be-committee`, apiResponseOf(schema), { token });
}

// Login de Transportes Guatemala. El servicio responde JSON directo, sin envelope.
export async function transportRequest(
  path:
    | "auth/login"
    | "auth/login/tfa"
    | "auth/register"
    | "users/profile"
    | "auth/forgot-password"
    | "users/reset-password",
  options: { body?: unknown; token?: string } = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/${path}`, {
      method: options.body === undefined ? "GET" : "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo conectar al servidor. Verifica que el gateway y user-service estén disponibles.",
    );
  }
  if (!response.ok) {
    throw new ApplicationError(
      response.status === 401 ? "auth.invalid_credentials" : "system.internal_error",
      response.status,
      path === "users/reset-password"
        ? "No se pudo restablecer la contraseña. El enlace puede haber vencido o ya fue utilizado. Solicita uno nuevo."
        : path === "auth/forgot-password"
          ? "No se pudo solicitar el correo de recuperación. Inténtalo de nuevo."
          : path === "auth/register"
            ? response.status === 409
              ? "Ya existe una cuenta con esos datos. Revisa tu correo, DPI y NIT."
              : response.status === 400
                ? "No se pudo registrar la cuenta. Revisa los datos ingresados."
                : "No se pudo crear la cuenta. Inténtalo de nuevo."
            : response.status === 401
              ? "Credenciales o código incorrectos."
              : response.status === 403
                ? "Acceso rechazado. Comprueba que tu cuenta esté activa."
                : response.status === 400
                  ? "Datos o código de verificación inválidos."
                  : "El servicio no pudo completar la solicitud.",
    );
  }
  if (response.status === 204) return null;
  return response.json();
}
