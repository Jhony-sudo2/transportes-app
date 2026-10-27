"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCustomerData, readCustomerResponse } from "@/hooks/useCustomerData";
import { AdminBranchIdsSchema, type AdminUser } from "@/lib/validators/admin-user";
import { BranchListSchema } from "@/lib/validators/branch";
import { CustomerDataState } from "./CustomerDataState";

export function AdminUserBranches({
  user,
  onClose,
  onAssigned,
}: {
  user: AdminUser;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const path = `/api/admin/users/${user.id}/branches`;
  const assignments = useCustomerData(path, AdminBranchIdsSchema);
  const catalog = useCustomerData("/api/admin/branches", BranchListSchema);
  const [branchId, setBranchId] = useState("");
  const [working, setWorking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef(false);
  const loading = assignments.loading || catalog.loading;
  const available = catalog.data?.filter((branch) => !assignments.data?.includes(branch.id)) ?? [];
  function refresh() {
    setBranchId("");
    setUncertain(false);
    setError("");
    assignments.refresh();
    catalog.refresh();
    onAssigned();
  }
  async function assign(event: React.FormEvent) {
    event.preventDefault();
    if (
      active.current ||
      uncertain ||
      loading ||
      !available.some((branch) => branch.id === Number(branchId))
    )
      return;
    active.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    let ambiguous = true;
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: Number(branchId) }),
      });
      ambiguous = response.ok || response.status >= 500;
      if (response.status !== 204) {
        await readCustomerResponse(response);
        throw new Error("No se pudo confirmar la asignación.");
      }
      const name =
        available.find((branch) => branch.id === Number(branchId))?.name ?? `Sucursal #${branchId}`;
      setNotice(`${name} fue asignada a ${user.name} ${user.lastName}.`);
      setBranchId("");
      assignments.refresh();
      onAssigned();
    } catch (cause) {
      setUncertain(ambiguous);
      setError(
        (cause instanceof Error ? cause.message : "No se pudo asignar la sucursal.") +
          (ambiguous
            ? " La asignación podría haberse registrado. Actualiza antes de volver a intentarlo."
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
        if (!open && !active.current) onClose();
      }}
    >
      <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
        <DialogHeader>
          <DialogTitle>Sucursales del administrador</DialogTitle>
          <DialogDescription className="break-words text-[var(--tg-muted)]">
            {user.name} {user.lastName} · {user.email}. Desde tu cuenta de administrador del sistema
            puedes asignarle sucursales.
          </DialogDescription>
        </DialogHeader>
        <CustomerDataState
          loading={loading}
          error={assignments.error || catalog.error}
          retry={refresh}
        />
        {assignments.data && catalog.data && !loading && (
          <>
            <section
              aria-label="Sucursales asignadas"
              className="rounded-xl border border-[var(--tg-line)] p-4"
            >
              <h3 className="text-sm font-semibold">
                Sucursales asignadas ({assignments.data.length})
              </h3>
              {assignments.data.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {assignments.data.map((id) => (
                    <li key={id}>
                      {catalog.data?.find((branch) => branch.id === id)?.name ?? `Sucursal #${id}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--tg-muted)]">
                  Este administrador no tiene sucursales asignadas.
                </p>
              )}
            </section>
            <form onSubmit={(event) => void assign(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assign-branch">Sucursal para asignar</Label>
                <select
                  id="assign-branch"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  disabled={working || uncertain || !available.length}
                  className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm disabled:opacity-60"
                >
                  <option value="">Selecciona una sucursal</option>
                  {available.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                {!available.length && (
                  <p className="text-sm text-[var(--tg-muted)]">
                    No hay sucursales pendientes de asignar a este administrador.
                  </p>
                )}
              </div>
              {notice && (
                <p role="status" className="text-sm text-[var(--tg-green)]">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              )}
              <DialogFooter className="gap-3">
                <Button type="button" variant="outline" disabled={working} onClick={onClose}>
                  Cerrar
                </Button>
                <Button type="button" variant="outline" disabled={working} onClick={refresh}>
                  Actualizar sucursales
                </Button>
                <Button
                  type="submit"
                  disabled={working || uncertain || !branchId || !available.length}
                >
                  {working ? "Asignando…" : "Asignar sucursal"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
