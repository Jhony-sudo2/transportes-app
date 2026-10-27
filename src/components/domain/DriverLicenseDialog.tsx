"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { FleetField } from "./FleetField";
import { useDriverDialog, type DriverDialogProps } from "./DriverManagementDialogs";
import { readFleetResponse } from "@/lib/fleet-ui";
import {
  DriverLicenseFormSchema,
  DriverLicenseContextSchema,
  DriverListRecordSchema,
} from "@/lib/validators/fleet-resources";

export function DriverLicenseDialog({ driver, branchId, actions }: DriverDialogProps) {
  const dialog = useDriverDialog(actions.refresh);
  const [context, setContext] = useState<z.infer<typeof DriverLicenseContextSchema> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof DriverLicenseFormSchema>>({
    resolver: zodResolver(DriverLicenseFormSchema),
  });

  useEffect(() => {
    if (!dialog.open) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setContext(null);
    void (async () => {
      try {
        const parsed = DriverLicenseContextSchema.safeParse(
          await readFleetResponse(
            await fetch(`/api/branch-admin/drivers/${driver.id}/license?branchId=${branchId}`, {
              signal: controller.signal,
              cache: "no-store",
            }),
          ),
        );
        if (
          !parsed.success ||
          parsed.data.branchId !== branchId ||
          !parsed.data.types.some((type) => type.id === parsed.data.license.licenseType)
        )
          throw new Error("No se pudieron verificar los datos de la licencia.");
        if (!controller.signal.aborted) {
          setContext(parsed.data);
          reset(parsed.data.license);
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setLoadError(cause instanceof Error ? cause.message : "No se pudo cargar la licencia.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [dialog.open, driver.id, branchId, retry, reset]);

  function submit(data: z.infer<typeof DriverLicenseFormSchema>) {
    if (!context) return;
    if (data.expirationDate < context.license.expirationDate) {
      setError("expirationDate", {
        message: "El vencimiento no puede ser anterior al de la licencia actual.",
      });
      return;
    }
    void dialog.run(async () => {
      const body = await readFleetResponse(
        await fetch(`/api/branch-admin/drivers/${driver.id}/license`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId, ...data }),
        }),
      );
      if (
        !body ||
        typeof body !== "object" ||
        !("item" in body) ||
        !("branchId" in body) ||
        body.branchId !== branchId
      )
        throw new Error("No se pudo confirmar la licencia.");
      const result = DriverListRecordSchema.safeParse(body.item);
      const type = context.types.find((item) => item.id === data.licenseType);
      if (
        !result.success ||
        result.data.id !== driver.id ||
        result.data.number !== data.number ||
        result.data.expirationDate !== data.expirationDate ||
        result.data.licenseTypeId !== data.licenseType ||
        result.data.licenseTypeName !== type?.name
      )
        throw new Error("La respuesta no confirma la licencia solicitada.");
      actions.update(result.data);
      actions.notify(`Licencia de ${driver.name} ${driver.lastName} actualizada.`);
    });
  }
  const prefix = `driver-license-${driver.id}`;
  return (
    <Dialog open={dialog.open} onOpenChange={dialog.changeOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={dialog.busy}
          aria-label={`Actualizar licencia de ${driver.name} ${driver.lastName}`}
        >
          Actualizar licencia
        </Button>
      </DialogTrigger>
      <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
        <DialogHeader>
          <DialogTitle>Actualizar licencia</DialogTitle>
          <DialogDescription className="text-[var(--tg-muted)]">
            Edita la licencia de {driver.name} {driver.lastName}.
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <p role="status" className="text-sm">
            Cargando licencia…
          </p>
        )}
        {loadError && (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {loadError}
            </p>
            <Button type="button" variant="outline" onClick={() => setRetry((value) => value + 1)}>
              Reintentar
            </Button>
          </div>
        )}
        {context && (
          <form
            noValidate
            onSubmit={(event) => void handleSubmit(submit)(event)}
            className="space-y-5"
          >
            <fieldset disabled={dialog.working} className="space-y-4">
              <FleetField
                id={prefix + "-number"}
                label="Número de licencia"
                maxLength={255}
                required
                autoComplete="off"
                error={errors.number}
                {...register("number")}
              />
              <FleetField
                id={prefix + "-expiration"}
                label="Vencimiento de la licencia"
                type="date"
                required
                min={context.license.expirationDate}
                error={errors.expirationDate}
                {...register("expirationDate")}
              />
              <p className="text-xs text-[var(--tg-muted)]">
                El vencimiento debe ser igual o posterior al de la licencia actual.
              </p>
              <div className="space-y-2">
                <Label htmlFor={prefix + "-type"}>Tipo de licencia</Label>
                <select
                  id={prefix + "-type"}
                  required
                  aria-invalid={!!errors.licenseType}
                  aria-describedby={errors.licenseType ? prefix + "-type-error" : undefined}
                  className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm disabled:opacity-60"
                  {...register("licenseType", { valueAsNumber: true })}
                >
                  {context.types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {errors.licenseType && (
                  <p id={prefix + "-type-error"} role="alert" className="text-xs text-red-600">
                    {errors.licenseType.message}
                  </p>
                )}
              </div>
            </fieldset>
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
              <Button type="submit" disabled={dialog.busy}>
                {dialog.working ? "Guardando…" : "Guardar licencia"}
              </Button>
            </DialogFooter>
          </form>
        )}
        {!context && (
          <Button type="button" variant="outline" onClick={() => dialog.changeOpen(false)}>
            Cerrar
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
