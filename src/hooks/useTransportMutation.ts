"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { readFleetResponse } from "@/lib/fleet-ui";
export function useTransportMutation() {
  const workspace = useBranchWorkspace();
  const sending = useRef(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  function reset() {
    if (!sending.current) {
      setError("");
      setUncertain(false);
    }
  }
  async function run<T>(
    path: string,
    body: unknown,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST",
  ): Promise<T | undefined> {
    if (sending.current || workspace.busy || uncertain) return undefined;
    sending.current = true;
    workspace.setBusy(true);
    setError("");
    let ambiguous = true;
    try {
      const response = await fetch(path, {
        method,
        signal: AbortSignal.timeout(15000),
        ...(body === undefined
          ? {}
          : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      });
      ambiguous = response.ok || response.status >= 500;
      const raw = response.status === 204 ? null : await readFleetResponse(response);
      const parsed = schema.safeParse(raw);
      if (!parsed.success)
        throw new Error(
          "No se pudo verificar el resultado. Actualiza los datos antes de repetir la operación.",
        );
      return parsed.data;
    } catch (cause) {
      setUncertain(ambiguous);
      setError(
        cause instanceof Error && !(cause instanceof TypeError) && !(cause instanceof DOMException)
          ? cause.message
          : "No se pudo confirmar la operación. Revisa el estado antes de repetirla.",
      );
      return undefined;
    } finally {
      sending.current = false;
      workspace.setBusy(false);
    }
  }
  return { run, reset, error, uncertain, busy: workspace.busy, sending };
}
