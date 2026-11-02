import "server-only";
import { ApplicationError } from "@/types/error";
import { readUpstreamProblem } from "./responses";
type FleetPath =
  | "bus-types"
  | `bus-types/${number}`
  | "buses"
  | "buses/states"
  | "drivers"
  | "drivers/me"
  | `drivers/${number}`
  | `drivers/${number}/salary`
  | `buses/${number}`
  | `buses/${number}/disponibilidad`
  | `drivers/${number}/disponibilidad?active=${boolean}`
  | "licenses/types"
  | `licenses/${number}`
  | `branches/${number}/drivers`
  | `branches/${number}/buses`
  | `drivers/${number}/operations/${string}`
  | "branches"
  | `branches/${number}`
  | "directions/departments"
  | `directions/departments/${number}/municipalities`;
export async function fleetRequest(
  path: FleetPath,
  token: string,
  body?: unknown,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = body === undefined ? "GET" : "POST",
): Promise<unknown> {
  const base = (process.env["GATEWAY_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
  const multipart = body instanceof FormData;
  const entity = path.startsWith("bus-types")
    ? "tipo de bus"
    : path.startsWith("buses")
      ? "bus"
      : path.startsWith("drivers")
        ? "chofer"
        : path.startsWith("licenses")
          ? "licencia"
          : "sucursal";
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        ...(multipart ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
      },
      ...(body === undefined
        ? {}
        : { body: multipart ? (body as FormData) : JSON.stringify(body) }),
    });
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      entity === "sucursal"
        ? "El servicio de sucursales no está disponible. Inténtalo nuevamente."
        : "No se pudo conectar al servicio de flota. Inténtalo nuevamente.",
    );
  }
  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Tu sesión ha vencido. Inicia sesión nuevamente."
        : response.status === 403
          ? "No tienes permiso para gestionar este recurso."
          : response.status === 413
            ? "La fotografía debe pesar como máximo 1 MB."
            : response.status === 404
              ? "No se encontró el registro o la ruta solicitada."
              : response.status === 409
                ? "Ya existe un registro con esos datos o su estado no permite el cambio."
                : response.status === 400 || response.status === 422
                  ? "Revisa los datos de " + entity + "."
                  : "No se pudo completar la operación de flota. Actualiza los datos antes de repetirla.";
    const problem = await readUpstreamProblem(response, fallback);
    throw new ApplicationError(
      response.status === 409 ? "resource.conflict" : "system.internal_error",
      response.status,
      problem.detail,
      problem.upstream,
    );
  }
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo confirmar la respuesta. Actualiza el listado antes de volver a guardar.",
    );
  }
}
