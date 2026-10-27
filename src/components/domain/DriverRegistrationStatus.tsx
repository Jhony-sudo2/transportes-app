"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { readFleetResponse } from "@/lib/fleet-ui";
import {
  DriverOperationSchema,
  type DriverOperationReference,
  type DriverOperation,
} from "@/lib/validators/fleet-resources";
export function DriverRegistrationStatus({
  reference,
  onNew,
}: {
  reference: DriverOperationReference;
  onNew: () => void;
}) {
  const [operation, setOperation] = useState<DriverOperation | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function check() {
      setChecking(true);
      setError("");
      try {
        const parsed = DriverOperationSchema.safeParse(
          await readFleetResponse(
            await fetch(
              `/api/branch-admin/drivers/${reference.driverId}/operations/${reference.operationId}?branchId=${reference.branchId}`,
              { signal: controller.signal, cache: "no-store" },
            ),
          ),
        );
        if (
          !parsed.success ||
          parsed.data.driverId !== reference.driverId ||
          parsed.data.operationId !== reference.operationId
        )
          throw new Error("No se pudo confirmar el estado del registro.");
        if (controller.signal.aborted) return;
        setOperation(parsed.data);
        if (parsed.data.status === "PENDING" && ++attempts < 12)
          timer = setTimeout(() => void check(), 5000);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudo consultar el registro.");
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }
    void check();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [reference.driverId, reference.operationId, reference.branchId, retry]);
  const status = operation?.status ?? "PENDING";
  return (
    <section className="space-y-5 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7 md:p-9">
      <h2 className="text-2xl font-semibold">
        {status === "COMPLETED"
          ? "Chofer registrado"
          : status === "REJECTED"
            ? "Registro rechazado"
            : "Registro en proceso"}
      </h2>
      <p role="status">
        {status === "COMPLETED"
          ? "La cuenta del chofer fue confirmada correctamente."
          : status === "REJECTED"
            ? "No se pudo confirmar la cuenta del chofer."
            : "Recibimos la solicitud. La cuenta del chofer está pendiente de confirmación."}
      </p>
      {operation?.failureReason && (
        <p role="alert" className="break-words text-sm">
          {operation.failureReason}
        </p>
      )}
      <p className="text-sm text-[var(--tg-muted)]">
        Registro de chofer #{reference.driverId}. Puedes recargar esta página para volver a
        consultar su estado.
      </p>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {status === "PENDING" && (
          <Button
            type="button"
            variant="outline"
            disabled={checking}
            onClick={() => setRetry((value) => value + 1)}
          >
            {checking ? "Consultando…" : "Consultar estado"}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/branch-admin/drivers/requests">Ver solicitudes de registro</Link>
        </Button>
        <Button type="button" onClick={onNew}>
          Registrar otro chofer
        </Button>
      </div>
    </section>
  );
}
