import "server-only";

import { NextResponse } from "next/server";
import { ApplicationError } from "@/types/error";
import type { UpstreamErrorContext } from "@/types/error";
export async function readUpstreamProblem(
  response: Response,
  fallback: string,
): Promise<{ detail: string; upstream: UpstreamErrorContext }> {
  const upstream: UpstreamErrorContext = {};
  let detail = fallback;
  try {
    const raw: unknown = await response.json();
    if (raw && typeof raw === "object") {
      const message = [
        "detail" in raw ? raw.detail : null,
        "message" in raw ? raw.message : null,
        "title" in raw ? raw.title : null,
      ].find((value) => typeof value === "string" && value.trim());
      if (response.status < 500 && typeof message === "string" && message.trim())
        detail = message.trim().slice(0, 1000);
      if ("code" in raw && typeof raw.code === "string" && raw.code.length <= 128)
        upstream.code = raw.code;
      if (
        "correlationId" in raw &&
        typeof raw.correlationId === "string" &&
        raw.correlationId.length <= 128
      )
        upstream.correlationId = raw.correlationId;
    }
  } catch {
    /* Conservar el mensaje general ante una respuesta no válida. */
  }
  return { detail, upstream };
}

function problemJson(status: number, code: string, title: string, detail?: string): NextResponse {
  return NextResponse.json(
    { code, title, detail: detail ?? title, status },
    {
      status,
      headers: { "Content-Type": "application/problem+json" },
    },
  );
}

export function unauthorizedResponse(): NextResponse {
  return problemJson(401, "auth.token_invalid", "No autenticado");
}

export function forbiddenResponse(): NextResponse {
  return problemJson(403, "auth.forbidden", "Acceso denegado");
}

export function notFoundResponse(resource: string): NextResponse {
  return problemJson(
    404,
    "resource.not_found",
    "Recurso no encontrado",
    `El recurso '${resource}' no fue encontrado`,
  );
}

export function conflictResponse(code: string, detail: string): NextResponse {
  return problemJson(409, code, "Conflicto", detail);
}

export function internalErrorResponse(): NextResponse {
  return problemJson(500, "system.internal_error", "Error interno del servidor");
}

export function applicationErrorResponse(error: ApplicationError): NextResponse {
  return NextResponse.json(
    {
      code: error.upstream?.code ?? error.code,
      title: error.detail,
      detail: error.detail,
      status: error.status,
      ...(error.upstream?.correlationId ? { correlationId: error.upstream.correlationId } : {}),
    },
    { status: error.status, headers: { "Content-Type": "application/problem+json" } },
  );
}
