"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import type { PendingCommand } from "@/types/operation-form";
export function useIdempotentCommand(scope: string) {
  const { busy, setBusy } = useBranchWorkspace();
  const sending = useRef(false);
  const [pending, setPending] = useState<PendingCommand | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const storageKey = `transport:pending:${scope}`;
  useEffect(() => {
    setReady(false);
    setPending(null);
    setError("");
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const v: unknown = JSON.parse(raw);
        if (
          !v ||
          typeof v !== "object" ||
          !("key" in v) ||
          typeof v.key !== "string" ||
          !("path" in v) ||
          typeof v.path !== "string" ||
          !v.path.startsWith("/api/") ||
          !("method" in v) ||
          !["POST", "PATCH", "PUT"].includes(String(v.method)) ||
          !("body" in v)
        )
          throw new Error();
        setPending(v as PendingCommand);
      }
    } catch {
      setError("No se pudo recuperar la operación. Revisa el historial antes de continuar.");
      return;
    }
    setReady(true);
  }, [storageKey]);
  async function execute<T>(
    path: string,
    body: unknown,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    method: "POST" | "PATCH" | "PUT" = "POST",
  ): Promise<T | undefined> {
    if (!ready || sending.current || busy) return undefined;
    const command = pending ?? { key: crypto.randomUUID(), path, body, method };
    if (
      pending &&
      (pending.path !== path ||
        JSON.stringify(pending.body) !== JSON.stringify(body) ||
        pending.method !== method)
    ) {
      setError("Primero recupera la operación pendiente con los mismos datos.");
      return undefined;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    let definitive = false;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(command));
      setPending(command);
      const response = await fetch(command.path, {
        method: command.method,
        headers: { "Content-Type": "application/json", "Idempotency-Key": command.key },
        body: JSON.stringify(command.body),
        signal: AbortSignal.timeout(20000),
      });
      const raw: unknown = await response.json().catch(() => null);
      const code =
        raw && typeof raw === "object" && "code" in raw && typeof raw.code === "string"
          ? raw.code
          : "";
      const safeRejections = new Set([
        "HOLD_EXPIRED",
        "SEAT_NOT_AVAILABLE",
        "WALLET_INSUFFICIENT",
        "CASH_NOT_INITIALIZED",
        "CASH_INSUFFICIENT",
        "QUOTE_NOT_PAYABLE",
        "CUTOFF_REACHED",
        "AMOUNT_INVALID",
      ]);
      definitive =
        response.status >= 400 &&
        response.status < 500 &&
        ![401, 403, 404].includes(response.status) &&
        code !== "IDEMPOTENCY_CONFLICT" &&
        (!pending || safeRejections.has(code));
      if (!response.ok)
        throw new Error(
          raw && typeof raw === "object" && "detail" in raw && typeof raw.detail === "string"
            ? raw.detail
            : "La operación no fue confirmada. Consulta su estado o recupera la misma referencia.",
        );
      const result = schema.safeParse(raw);
      if (!result.success)
        throw new Error(
          "No se pudo verificar el resultado. Recupera la misma operación antes de iniciar otra.",
        );
      sessionStorage.removeItem(storageKey);
      setPending(null);
      return result.data;
    } catch (cause) {
      if (definitive) {
        sessionStorage.removeItem(storageKey);
        setPending(null);
      }
      setError(
        cause instanceof Error && !(cause instanceof DOMException) && !(cause instanceof TypeError)
          ? cause.message
          : "No se pudo confirmar el resultado. Puedes recuperar la misma operación sin generar otro cobro.",
      );
      return undefined;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  // Solo para operaciones sin cobro: olvida la referencia pendiente para corregir los datos.
  function discard() {
    if (sending.current) return;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* sin almacenamiento: basta con limpiar el estado */
    }
    setPending(null);
    setError("");
  }
  return { execute, discard, pending, ready, busy, error, sending };
}
