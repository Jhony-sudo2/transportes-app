"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { readFleetResponse } from "@/lib/fleet-ui";
import {
  DriverListRecordSchema,
  DriverSalaryRequestSchema,
  type DriverListRecord,
} from "@/lib/validators/fleet-resources";
import type { FleetRecordsActions } from "./FleetRecordsList";

export type DriverDialogProps = {
  driver: DriverListRecord;
  branchId: number;
  actions: FleetRecordsActions<DriverListRecord>;
};

export function useDriverDialog(refresh: () => void) {
  const { busy, setBusy } = useBranchWorkspace();
  const active = useRef(false);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  function changeOpen(next: boolean) {
    if (active.current) return;
    if (!next && error) refresh();
    if (next) setError("");
    setOpen(next);
  }
  async function run(action: () => Promise<void>) {
    if (active.current || busy) return;
    active.current = true;
    setWorking(true);
    setBusy(true);
    setError("");
    try {
      await action();
      setOpen(false);
    } catch (cause) {
      setError(
        (cause instanceof Error ? cause.message : "No se pudo confirmar la operación.") +
          " Al cerrar se consultará nuevamente el listado para verificar el resultado.",
      );
    } finally {
      active.current = false;
      setWorking(false);
      setBusy(false);
    }
  }
  return { busy, open, working, error, changeOpen, run };
}

export function DriverSalaryDialog({ driver, branchId, actions }: DriverDialogProps) {
  const dialog = useDriverDialog(actions.refresh);
  const [value, setValue] = useState("");
  const [validation, setValidation] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = DriverSalaryRequestSchema.safeParse({ branchId, baseSalary: Number(value) });
    if (!parsed.success) {
      setValidation("Ingresa un salario mayor que cero.");
      return;
    }
    setValidation("");
    void dialog.run(async () => {
      const body = await readFleetResponse(
        await fetch(`/api/branch-admin/drivers/${driver.id}/salary`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        }),
      );
      if (
        !body ||
        typeof body !== "object" ||
        !("item" in body) ||
        !("branchId" in body) ||
        body.branchId !== branchId
      )
        throw new Error("No se pudo confirmar el salario.");
      const result = DriverListRecordSchema.safeParse(body.item);
      if (
        !result.success ||
        result.data.id !== driver.id ||
        result.data.baseSalary !== parsed.data.baseSalary
      )
        throw new Error("La respuesta no confirma el salario solicitado.");
      actions.update(result.data);
      actions.notify(`Salario de ${driver.name} ${driver.lastName} actualizado.`);
    });
  }
  return (
    <Dialog open={dialog.open} onOpenChange={dialog.changeOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={dialog.busy}
          aria-label={`Actualizar salario de ${driver.name} ${driver.lastName}`}
          onClick={() => {
            setValue(String(driver.baseSalary ?? ""));
            setValidation("");
          }}
        >
          Actualizar salario
        </Button>
      </DialogTrigger>
      <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
        <DialogHeader>
          <DialogTitle>Actualizar salario base</DialogTitle>
          <DialogDescription className="text-[var(--tg-muted)]">
            Nuevo salario para {driver.name} {driver.lastName}, en quetzales.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`driver-salary-${driver.id}`}>Nuevo salario base (Q)</Label>
            <Input
              id={`driver-salary-${driver.id}`}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={dialog.working}
              aria-invalid={!!validation}
              aria-describedby={validation ? `driver-salary-error-${driver.id}` : undefined}
            />
            {validation && (
              <p
                id={`driver-salary-error-${driver.id}`}
                role="alert"
                className="text-sm text-red-600"
              >
                {validation}
              </p>
            )}
          </div>
          {dialog.error && (
            <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">
              {dialog.error}
            </p>
          )}
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={dialog.working}
              onClick={() => dialog.changeOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={dialog.working}>
              {dialog.working ? "Guardando…" : "Guardar salario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDriverRequestDialog({ driver, branchId, actions }: DriverDialogProps) {
  const dialog = useDriverDialog(actions.refresh);
  return (
    <Dialog open={dialog.open} onOpenChange={dialog.changeOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={dialog.busy}
          aria-label={`Eliminar solicitud de ${driver.name} ${driver.lastName}`}
        >
          Eliminar solicitud
        </Button>
      </DialogTrigger>
      <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
        <DialogHeader>
          <DialogTitle>Eliminar solicitud rechazada</DialogTitle>
          <DialogDescription className="text-[var(--tg-muted)]">
            Se eliminará el registro de {driver.name} {driver.lastName} en Fleet. Podrás registrarlo
            nuevamente cuando corrijas los datos. El historial de la operación se conserva.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-red-300 bg-red-500/5 p-4 text-sm">
          <p className="font-semibold">Motivo del rechazo</p>
          <p className="mt-2 break-words">
            {driver.failureReason || "No se recibió un detalle del rechazo."}
          </p>
        </div>
        {dialog.error && (
          <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">
            {dialog.error}
          </p>
        )}
        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={dialog.working}
            onClick={() => dialog.changeOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={dialog.working}
            onClick={() =>
              void dialog.run(async () => {
                const body = await readFleetResponse(
                  await fetch(`/api/branch-admin/drivers/${driver.id}?branchId=${branchId}`, {
                    method: "DELETE",
                  }),
                );
                if (
                  !body ||
                  typeof body !== "object" ||
                  !("deletedId" in body) ||
                  body.deletedId !== driver.id ||
                  !("branchId" in body) ||
                  body.branchId !== branchId
                )
                  throw new Error("No se pudo confirmar la eliminación.");
                actions.remove(driver.id);
                actions.notify(`Solicitud de ${driver.name} ${driver.lastName} eliminada.`);
              })
            }
          >
            {dialog.working ? "Eliminando…" : "Confirmar eliminación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
