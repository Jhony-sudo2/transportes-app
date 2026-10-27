import "server-only";
import { cookies } from "next/headers";
import { getTransportSession } from "@/lib/auth/session";
import { fleetRequest } from "@/lib/api/fleet";
import { validatedFleetResult } from "@/lib/api/branch-workspace";
import { AccountDriverSchema, AccountProfileSchema } from "@/lib/validators/account";
import { ApplicationError } from "@/types/error";

export async function requireAccountAccess() {
  const user = await getTransportSession();
  const token = (await cookies()).get("access_token")?.value;
  if (!user || !user.isActive || !token)
    throw new ApplicationError(
      "auth.token_invalid",
      401,
      "Inicia sesión para administrar tu cuenta.",
    );
  if (user.resetPassword)
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "Establece tu contraseña desde el enlace del correo para continuar.",
    );
  return { user, token };
}
export async function getOwnDriver(access: Awaited<ReturnType<typeof requireAccountAccess>>) {
  if (access.user.role.name !== "DRIVER")
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "Esta operación corresponde al perfil de chofer.",
    );
  let raw: unknown;
  try {
    raw = await fleetRequest("drivers/me", access.token);
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401)
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo validar tu perfil de chofer en Fleet. Inténtalo nuevamente.",
      );
    throw error;
  }
  const driver = validatedFleetResult(
    AccountDriverSchema,
    raw,
    "No se pudieron verificar los datos de tu perfil en Fleet.",
  );
  if (driver.userId !== access.user.id)
    throw new ApplicationError("auth.forbidden", 403, "El chofer no corresponde a tu cuenta.");
  return driver;
}
export async function getAccountProfile(access?: Awaited<ReturnType<typeof requireAccountAccess>>) {
  const current = access ?? (await requireAccountAccess());
  const driver = current.user.role.name === "DRIVER" ? await getOwnDriver(current) : null;
  return AccountProfileSchema.parse({ user: current.user, driver });
}
export async function accountIamRequest(
  path: `users/${number}` | "users/profile/password",
  token: string,
  body: unknown,
  method: "PUT" | "POST",
): Promise<unknown> {
  const base = (process.env["GATEWAY_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo confirmar el cambio. Verifica tus datos antes de volver a guardarlos.",
    );
  }
  if (!response.ok) {
    let message =
      response.status === 401
        ? "Tu sesión ha vencido. Inicia sesión nuevamente."
        : response.status === 409
          ? "El correo o NIT ya pertenece a otra cuenta."
          : "No se pudo guardar el cambio de tu cuenta.";
    if (response.status === 400 || response.status === 409) {
      try {
        const problem: unknown = await response.json();
        if (problem && typeof problem === "object") {
          const detail =
            "detail" in problem ? problem.detail : "message" in problem ? problem.message : null;
          if (typeof detail === "string" && detail.trim()) message = detail.slice(0, 1000);
        }
      } catch {
        /* Conserva el mensaje general. */
      }
    }
    throw new ApplicationError(
      response.status === 409 ? "resource.conflict" : "system.internal_error",
      response.status,
      message,
    );
  }
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo confirmar la respuesta del servicio de usuarios.",
    );
  }
}
