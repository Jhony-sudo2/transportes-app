import "server-only";

import { NextResponse } from "next/server";
import { ApplicationError } from "@/types/error";

function problemJson(
  status: number,
  code: string,
  title: string,
  detail?: string,
): NextResponse {
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
  return problemJson(error.status, error.code, error.detail, error.detail);
}
