"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, BusFront, UserRoundPlus, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManagementNavigation } from "./ManagementNavigation";
import { useBranchWorkspace } from "./BranchWorkspaceProvider";
import {
  ManagedBranchContextSchema,
  ManagedBranchSelectionResponseSchema,
  type ManagedBranchContext,
} from "@/lib/validators/branch-context";

const items = [
  { label: "Buses", icon: BusFront, href: "/sucursal/buses" },
  { label: "Choferes", icon: UserRoundPlus, href: "/sucursal/choferes" },
  { label: "Viajes", icon: Route, href: null },
];
async function responseData(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String(body.detail)
        : "No se pudieron consultar tus sucursales.";
    throw new Error(detail);
  }
  return body;
}
export function BranchAdminNavigation({ name }: { name: string }) {
  const router = useRouter();
  const { busy } = useBranchWorkspace();
  const [context, setContext] = useState<ManagedBranchContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const result = ManagedBranchContextSchema.parse(
          await responseData(
            await fetch("/api/branch-admin/context", {
              signal: controller.signal,
              cache: "no-store",
            }),
          ),
        );
        if (!controller.signal.aborted) setContext(result);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setContext(null);
          setError(
            cause instanceof Error ? cause.message : "No se pudieron consultar tus sucursales.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [retry]);
  async function selectBranch(branchId: number) {
    setSaving(true);
    setError("");
    try {
      const result = ManagedBranchSelectionResponseSchema.parse(
        await responseData(
          await fetch("/api/branch-admin/context", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branchId }),
          }),
        ),
      );
      if (!context?.branches.some((branch) => branch.id === result.selectedBranchId))
        throw new Error("La sucursal seleccionada no está disponible.");
      setContext({ ...context, selectedBranchId: result.selectedBranchId });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la sucursal.");
    } finally {
      setSaving(false);
    }
  }
  const activeBranch = context?.branches.find((branch) => branch.id === context.selectedBranchId);
  return (
    <ManagementNavigation
      name={name}
      role="Administrador de sucursales"
      navigationLabel="Navegación de administrador de sucursales"
      items={items.map((item) => ({
        ...item,
        href: !busy && !loading && !saving && activeBranch ? item.href : null,
        disabledReason: item.href
          ? busy
            ? "Espera a que termine la operación."
            : "Selecciona una sucursal para continuar."
          : "Viajes: próximamente",
      }))}
      note="Consulta y registra los buses y choferes de la sucursal seleccionada. Viajes próximamente."
    >
      <div className="mb-4 rounded-xl border border-[var(--tg-line)] bg-[var(--color-surface)] p-4">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Building2 size={21} className="shrink-0 text-[var(--tg-green)]" aria-hidden="true" />
            <div className="min-w-0">
              <label htmlFor="managed-branch" className="block text-sm font-semibold">
                Administrar sucursal
              </label>
              <p className="mt-1 text-xs text-[var(--tg-muted)]">
                Elige la sede con la que trabajarás.
              </p>
            </div>
          </div>
          <select
            id="managed-branch"
            aria-describedby="managed-branch-status"
            value={context?.selectedBranchId ?? ""}
            disabled={loading || saving || busy || !context?.branches.length}
            onChange={(event) => void selectBranch(Number(event.target.value))}
            className="h-12 w-full min-w-0 cursor-pointer rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm text-[var(--tg-ink)] disabled:cursor-default disabled:opacity-70 md:max-w-md"
          >
            <option value="" disabled>
              {loading
                ? "Cargando sucursales…"
                : !context
                  ? "Sucursales no disponibles"
                  : !context.branches.length
                    ? "Sin sucursales asignadas"
                    : "Selecciona una sucursal"}
            </option>
            {context?.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <p
          id="managed-branch-status"
          role="status"
          aria-live="polite"
          className="mt-3 break-words text-xs text-[var(--tg-muted)]"
        >
          {saving
            ? "Cambiando sucursal…"
            : loading
              ? "Consultando tus sucursales asignadas…"
              : activeBranch
                ? `Administrando: ${activeBranch.name}`
                : context && !context.branches.length
                  ? "Tu cuenta todavía no tiene sucursales asignadas. Contacta al administrador."
                  : context
                    ? "Selecciona una sucursal para continuar."
                    : ""}
        </p>
        {error && (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <p className="min-w-0 break-words">{error}</p>
            {!context && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRetry((value) => value + 1)}
              >
                Reintentar sucursales
              </Button>
            )}
          </div>
        )}
      </div>
    </ManagementNavigation>
  );
}
