import "server-only";
import { cookies } from "next/headers";
import { getTransportSession } from "@/lib/auth/session";
import { ApplicationError } from "@/types/error";
import { applicationErrorResponse, internalErrorResponse } from "@/lib/api/responses";
export async function requireAdminAccess() {
  const user = await getTransportSession();
  if (!user || !user.isActive)
    throw new ApplicationError("auth.token_invalid", 401, "Inicia sesión para continuar.");
  if (user.role.name !== "ADMIN" || user.resetPassword)
    throw new ApplicationError("auth.forbidden", 403, "Se requiere una cuenta de administrador.");
  const token = (await cookies()).get("access_token")?.value;
  if (!token)
    throw new ApplicationError("auth.token_invalid", 401, "Inicia sesión para continuar.");
  return { user, token };
}
export async function adminRequest(
  path:
    | "users"
    | "roles"
    | "users/cashiers"
    | `users?${string}`
    | `users/${number}/branches`
    | "users/branch-administrators",
  token: string,
  body?: unknown,
): Promise<unknown> {
  const base = (process.env["GATEWAY_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
  const assignment = path === "users/branch-administrators";
  const uncertainAssignment =
    "No se pudo confirmar la asignación. Actualiza las sucursales del usuario antes de volver a enviarla.";
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      assignment ? uncertainAssignment : "No se pudo conectar al servicio de usuarios.",
    );
  }
  if (!response.ok) {
    let detail =
      response.status === 409
        ? "Ya existe una cuenta o persona con ese correo, DPI o NIT. Revisa los datos."
        : response.status === 401
          ? "Tu sesión ha vencido. Inicia sesión nuevamente."
          : response.status === 403
            ? "No tienes permiso para realizar esta operación."
            : response.status === 400
              ? "Los datos no fueron aceptados. Revisa los campos y el rol seleccionado."
              : "El servicio de usuarios no pudo completar la operación.";
    if (assignment) {
      if (response.status >= 500) detail = uncertainAssignment;
      else if (response.status === 409)
        detail = "El servicio rechazó la asignación de esta sucursal al administrador.";
      if (response.status === 400 || response.status === 409 || response.status === 422) {
        try {
          const problem: unknown = await response.json();
          if (
            problem &&
            typeof problem === "object" &&
            "detail" in problem &&
            typeof problem.detail === "string" &&
            problem.detail.trim()
          )
            detail = problem.detail.slice(0, 1000);
        } catch {
          /* Conserva el mensaje general. */
        }
      }
    }
    throw new ApplicationError(
      response.status === 409 ? "resource.conflict" : "system.internal_error",
      response.status,
      detail,
    );
  }
  if (assignment) {
    if (response.status === 204) return null;
    throw new ApplicationError("system.internal_error", 502, uncertainAssignment);
  }
  try {
    return await response.json();
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo confirmar la respuesta. Si intentabas crear una cuenta, consulta con el administrador antes de repetir la solicitud.",
    );
  }
}
export function adminErrorResponse(error: unknown) {
  if (error instanceof ApplicationError) return applicationErrorResponse(error);
  return internalErrorResponse();
}
