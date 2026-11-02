"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FleetField } from "./FleetField";
import { CustomerRecordsTable } from "./CustomerRecordsTable";
import { useCustomerData } from "@/hooks/useCustomerData";
import { BusTypeInputSchema, BusTypeListSchema, BusTypeSchema } from "@/lib/validators/bus-type";
import { readFleetResponse } from "@/lib/fleet-ui";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import type { BusType, BusTypeInput } from "@/types/fleet";
const initial: BusTypeInput = {
  name: "",
  description: "",
  capacity: 1,
  fuelEstimatePerKm: 0,
  depreciationPerKm: 0,
  suggestedDriverSalaryPerTrip: 0,
  active: true,
};
export function BusTypesPageClient() {
  const catalog = useCustomerData("/api/admin/bus-types", BusTypeListSchema);
  const { busy, setBusy } = useBranchWorkspace();
  const sending = useRef(false);
  const [editing, setEditing] = useState<BusType | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BusTypeInput>({ resolver: zodResolver(BusTypeInputSchema), defaultValues: initial });
  function edit(item: BusType | null) {
    if (busy) return;
    setEditing(item);
    setOpen(true);
    setError("");
    setNotice("");
    setUncertain(false);
    reset(
      item
        ? {
            name: item.name,
            description: item.description ?? "",
            capacity: item.capacity,
            fuelEstimatePerKm: item.fuelEstimatePerKm,
            depreciationPerKm: item.depreciationPerKm,
            suggestedDriverSalaryPerTrip: item.suggestedDriverSalaryPerTrip,
            active: item.active,
          }
        : initial,
    );
  }
  async function save(data: BusTypeInput) {
    if (sending.current || busy || uncertain) return;
    sending.current = true;
    setBusy(true);
    setError("");
    let ambiguous = true;
    try {
      const response = await fetch(
        editing ? `/api/admin/bus-types/${editing.id}` : "/api/admin/bus-types",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      ambiguous = response.ok || response.status >= 500;
      const item = BusTypeSchema.safeParse(await readFleetResponse(response));
      if (!item.success || (editing && item.data.id !== editing.id))
        throw new Error("No se pudo verificar el tipo de bus guardado.");
      setNotice(`Tipo de bus ${item.data.name} guardado.`);
      setOpen(false);
      catalog.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el tipo de bus.");
      setUncertain(ambiguous);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm leading-6 text-[var(--tg-muted)]">
        Define la capacidad y los valores sugeridos de cada categoría. Las tarifas nuevas se aplican
        a operaciones futuras; los viajes y cotizaciones conservan sus importes históricos.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => edit(null)}>
          Crear tipo de bus
        </Button>
        <Button
          variant="outline"
          disabled={busy || catalog.loading}
          onClick={() => catalog.refresh()}
        >
          Actualizar catálogo
        </Button>
      </div>
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {catalog.loading && <p role="status">Cargando tipos de bus…</p>}
      {catalog.error && (
        <p role="alert" className="tg-notice">
          {catalog.error}
        </p>
      )}
      {open && (
        <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6">
          <h2 className="mb-5 text-xl font-semibold">
            {editing ? `Editar ${editing.name}` : "Nuevo tipo de bus"}
          </h2>
          <form
            onSubmit={(event) => void handleSubmit(save)(event)}
            noValidate
            className="space-y-5"
          >
            <fieldset disabled={busy || uncertain} className="grid gap-5 sm:grid-cols-2">
              <FleetField
                id="bus-type-name"
                label="Nombre del tipo"
                maxLength={100}
                error={errors.name}
                {...register("name")}
              />
              <FleetField
                id="bus-type-capacity"
                label="Capacidad del tipo"
                type="number"
                min={1}
                step={1}
                error={errors.capacity}
                {...register("capacity", { valueAsNumber: true })}
              />
              <FleetField
                id="bus-type-description"
                label="Descripción (opcional)"
                maxLength={500}
                error={errors.description}
                {...register("description")}
              />
              <FleetField
                id="bus-type-fuel"
                label="Combustible estimado por km (Q)"
                type="number"
                min={0}
                step="0.0001"
                error={errors.fuelEstimatePerKm}
                {...register("fuelEstimatePerKm", { valueAsNumber: true })}
              />
              <FleetField
                id="bus-type-depreciation"
                label="Depreciación por km (Q)"
                type="number"
                min={0}
                step="0.0001"
                error={errors.depreciationPerKm}
                {...register("depreciationPerKm", { valueAsNumber: true })}
              />
              <FleetField
                id="bus-type-salary"
                label="Salario sugerido por tramo (Q)"
                type="number"
                min={0}
                step="0.01"
                error={errors.suggestedDriverSalaryPerTrip}
                {...register("suggestedDriverSalaryPerTrip", { valueAsNumber: true })}
              />
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" {...register("active")} /> Tipo activo
              </label>
            </fieldset>
            <p className="text-sm text-[var(--tg-muted)]">
              La capacidad de un tipo con buses asociados no puede cambiarse. El servicio verifica
              esta condición al guardar.
            </p>
            {error && (
              <p role="alert" className="tg-notice">
                {error}
              </p>
            )}
            {uncertain && (
              <p role="status" className="tg-notice">
                El cambio podría haberse registrado. Cierra el formulario y actualiza el catálogo
                antes de volver a enviarlo.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy || uncertain}>
                {busy ? "Guardando…" : "Guardar tipo de bus"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  catalog.refresh();
                }}
              >
                Cerrar formulario
              </Button>
            </div>
          </form>
        </section>
      )}
      {catalog.data && (
        <CustomerRecordsTable
          items={catalog.data}
          caption="Tipos de bus"
          columns={[
            {
              key: "name",
              header: "Tipo",
              render: (_, item) => (
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs">{item.description}</p>
                </div>
              ),
            },
            { key: "capacity", header: "Capacidad" },
            {
              key: "fuelEstimatePerKm",
              header: "Combustible Q/km",
              render: (value) => String(value),
            },
            {
              key: "depreciationPerKm",
              header: "Depreciación Q/km",
              render: (value) => String(value),
            },
            {
              key: "suggestedDriverSalaryPerTrip",
              header: "Salario sugerido Q/tramo",
              render: (value) => String(value),
            },
            {
              key: "active",
              header: "Estado",
              render: (_, item) => (item.active ? "Activo" : "Inactivo"),
            },
            {
              key: "id",
              header: "Opciones",
              render: (_, item) => (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => edit(item)}>
                  Editar {item.name}
                </Button>
              ),
            },
          ]}
          emptyMessage="No hay tipos de bus registrados."
        />
      )}
    </div>
  );
}
