"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { readFleetResponse } from "@/lib/fleet-ui";
import { BranchSchema } from "@/lib/validators/branch";
import type { Branch } from "@/types/branch";
export function BranchAvailabilityButton({
  branch,
  disabled,
  onUpdated,
}: {
  branch: Branch;
  disabled: boolean;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sending = useRef(false);
  function close(next: boolean) {
    if (sending.current) return;
    setOpen(next);
    if (!next) {
      setError("");
      onUpdated();
    }
  }
  async function confirm() {
    if (sending.current || branch.active === undefined || error) return;
    sending.current = true;
    setBusy(true);
    try {
      const item = BranchSchema.parse(
        await readFleetResponse(
          await fetch(`/api/admin/branches/${branch.id}/availability`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: !branch.active }),
          }),
        ),
      );
      if (item.id !== branch.id || item.active !== !branch.active)
        throw new Error("No se pudo verificar el estado actualizado.");
      setOpen(false);
      onUpdated();
    } catch (cause) {
      setError(
        (cause instanceof Error ? cause.message : "No se pudo confirmar el cambio.") +
          " Cierra esta ventana para consultar nuevamente la sucursal.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || branch.active === undefined}
          aria-label={`${branch.active ? "Deshabilitar" : "Habilitar"} sucursal ${branch.name}`}
        >
          {branch.active ? "Deshabilitar" : "Habilitar"}
          <span className="sr-only">: {branch.name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="transport-dialog">
        <DialogHeader>
          <DialogTitle>
            {branch.active ? "Deshabilitar sucursal" : "Habilitar sucursal"}
          </DialogTitle>
          <DialogDescription>
            {branch.name}. Para operar debe contar con un administrador activo. El servicio
            verificará las condiciones al confirmar.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="tg-notice">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => close(false)}>
            Cerrar
          </Button>
          <Button disabled={busy || !!error} onClick={() => void confirm()}>
            {busy ? "Guardando…" : "Confirmar estado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
