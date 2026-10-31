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
} from "@/components/ui/dialog";
import { readCustomerResponse } from "@/hooks/useCustomerData";
import { AdminUserAvailabilityResponseSchema, type AdminUser } from "@/lib/validators/admin-user";

export function AdminUserAvailabilityDialog({
  user,
  currentUserId,
  onClose,
  onUpdated,
  refresh,
}: {
  user: AdminUser;
  currentUserId: number;
  onClose: () => void;
  onUpdated: (user: AdminUser, signedOut: boolean) => void;
  refresh: () => void;
}) {
  const active = useRef(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const desired = !user.isActive;
  function close() {
    if (active.current) return;
    if (error) refresh();
    onClose();
  }
  async function confirm() {
    if (active.current || error) return;
    active.current = true;
    setWorking(true);
    let ambiguous = true;
    try {
      const response = await fetch(`/api/admin/users/${user.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: desired }),
      });
      ambiguous = response.ok || response.status >= 500;
      const result = AdminUserAvailabilityResponseSchema.safeParse(
        await readCustomerResponse(response),
      );
      if (
        !result.success ||
        result.data.user.id !== user.id ||
        result.data.user.isActive !== desired
      )
        throw new Error("La respuesta no confirma el cambio de estado solicitado.");
      onUpdated(result.data.user, result.data.signedOut);
    } catch (cause) {
      setError(
        (cause instanceof Error ? cause.message : "No se pudo cambiar el estado de la cuenta.") +
          (ambiguous
            ? " La operación podría haberse registrado. Actualiza el listado antes de volver a intentarlo."
            : ""),
      );
    } finally {
      active.current = false;
      setWorking(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
        <DialogHeader>
          <DialogTitle>{desired ? "Activar usuario" : "Desactivar usuario"}</DialogTitle>
          <DialogDescription className="break-words text-[var(--tg-muted)]">
            {user.name} {user.lastName} · {user.email}.{" "}
            {desired
              ? "La cuenta volverá a estar habilitada para iniciar sesión."
              : "La cuenta quedará inactiva y no podrá iniciar sesión hasta que sea activada nuevamente."}
          </DialogDescription>
        </DialogHeader>
        {!desired && currentUserId === user.id && (
          <p className="text-sm text-[var(--tg-muted)]">
            Esta es tu cuenta. Si la desactivas, se cerrará tu sesión.
          </p>
        )}
        {error && (
          <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" disabled={working} onClick={close}>
            Cancelar
          </Button>
          {error ? (
            <Button type="button" onClick={close}>
              Actualizar listado
            </Button>
          ) : (
            <Button
              type="button"
              variant={desired ? "default" : "destructive"}
              disabled={working}
              onClick={() => void confirm()}
            >
              {working
                ? "Guardando…"
                : desired
                  ? "Confirmar activación"
                  : "Confirmar desactivación"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
