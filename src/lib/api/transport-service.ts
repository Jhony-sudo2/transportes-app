import "server-only";
import { z } from "zod";
import { ApplicationError } from "@/types/error";
import { readUpstreamProblem } from "./responses";
export async function transportService(
  path: string,
  options: {
    token?: string | undefined;
    branchId?: number | undefined;
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    idempotencyKey?: string | undefined;
  } = {},
): Promise<unknown> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const base = (process.env["GATEWAY_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.branchId ? { "X-Operation-Branch-Id": String(options.branchId) } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      method === "GET"
        ? "El servicio no está disponible. Inténtalo nuevamente."
        : "No se pudo confirmar la operación. Consulta el estado antes de volver a enviarla.",
    );
  }
  if (!response.ok) {
    const problem = await readUpstreamProblem(
      response,
      response.status >= 500
        ? "El servicio no pudo confirmar la operación. Actualiza los datos antes de volver a intentarlo."
        : "La operación no fue aceptada. Revisa los datos y el estado del registro.",
    );
    throw new ApplicationError(
      response.status === 403
        ? "auth.forbidden"
        : response.status === 409
          ? "resource.conflict"
          : "system.internal_error",
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
      "No se pudo verificar la respuesta. Actualiza los datos antes de repetir la operación.",
    );
  }
}
export function serviceResult<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "El servicio devolvió datos que no se pudieron verificar. Actualiza la información.",
    );
  return parsed.data;
}
export function checkedBody<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new ApplicationError(
      "validation.failed",
      400,
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  return parsed.data;
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
}
