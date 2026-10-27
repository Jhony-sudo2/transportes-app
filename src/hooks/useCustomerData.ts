"use client";
import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";

export async function readCustomerResponse(response: Response): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("No se pudo leer la respuesta. Actualiza los datos antes de continuar.");
  }
  if (!response.ok)
    throw new Error(
      body && typeof body === "object" && "detail" in body
        ? String(body.detail)
        : "No se pudo completar la solicitud.",
    );
  return body;
}
export function useCustomerData<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    void (async () => {
      try {
        const result = schema.safeParse(
          await readCustomerResponse(
            await fetch(path, { signal: controller.signal, cache: "no-store" }),
          ),
        );
        if (!result.success) throw new Error("La respuesta recibida no tiene el formato esperado.");
        if (!controller.signal.aborted) setData(result.data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [path, schema, revision]);
  return { data, loading, error, refresh };
}
