"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusFront, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FleetField } from "./FleetField";
import { BusPhoto, BusPhotoInput } from "./BusPhoto";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { readFleetResponse } from "@/lib/fleet-ui";
import {
  BusFormSchema,
  EditBusFormSchema,
  UpdateBusSchema,
  BusListRecordSchema,
  CreatedBusSchema,
  fleetPhotoError,
} from "@/lib/validators/fleet-resources";
import type { BusFormData, CreatedBus, BusListRecord } from "@/types/fleet";
import { useCustomerData } from "@/hooks/useCustomerData";
import { BusTypeListSchema } from "@/lib/validators/bus-type";
import { BusStateListSchema } from "@/lib/validators/fleet-resources";
const fields: {
  name: FieldPath<BusFormData>;
  label: string;
  numeric?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
}[] = [
  { name: "plateNumber", label: "Número de placa", maxLength: 255 },
  { name: "brand", label: "Marca", maxLength: 255 },
  { name: "color", label: "Color", maxLength: 255 },
  { name: "model", label: "Modelo", maxLength: 100 },
  { name: "year_manufacture", label: "Año de fabricación", numeric: true, min: 1, max: 9999 },
  { name: "currentKm", label: "Kilometraje inicial", numeric: true, min: 0, max: 2147483647 },
  { name: "seatRows", label: "Filas de asientos", numeric: true, min: 1, max: 30 },
  { name: "seatColumns", label: "Columnas de asientos", numeric: true, min: 1, max: 6 },
];
export function CreateBusForm({
  branch,
  bus,
  onSaved,
  onCancel,
}: {
  branch: { id: number; name: string };
  bus?: BusListRecord;
  onSaved?: (item: BusListRecord) => void;
  onCancel?: () => void;
}) {
  const { busy, setBusy } = useBranchWorkspace();
  const active = useRef(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedBus | null>(null);
  const types = useCustomerData("/api/branch-admin/bus-types", BusTypeListSchema);
  const states = useCustomerData("/api/branch-admin/bus-states", BusStateListSchema);
  const { register, handleSubmit, getFieldState, formState, watch, reset } = useForm<BusFormData>({
    resolver: zodResolver(bus ? EditBusFormSchema : BusFormSchema),
    defaultValues: bus
      ? {
          branchId: branch.id,
          plateNumber: bus.plateNumber,
          brand: bus.brand,
          color: bus.color ?? "",
          model: bus.model,
          year_manufacture: bus.yearManufacture ?? Number.NaN,
          currentKm: bus.currentKm ?? 0,
          seatRows: bus.seatRows ?? Number.NaN,
          seatColumns: bus.seatColumns ?? Number.NaN,
          busTypeId: bus.busTypeId ?? Number.NaN,
          rentalEnabled: bus.rentalEnabled ?? false,
        }
      : { branchId: branch.id, rentalEnabled: false },
  });
  const rows = watch("seatRows"),
    columns = watch("seatColumns");
  const validSeats =
    Number.isInteger(rows) &&
    rows > 0 &&
    rows <= 30 &&
    Number.isInteger(columns) &&
    columns > 0 &&
    columns <= 6;
  const typeId = watch("busTypeId");
  const selectedType = types.data?.find((type) => type.id === typeId);
  const capacity = selectedType?.capacity ?? 0;
  async function submit(data: BusFormData) {
    if (active.current || busy || uncertain) return;
    if (!bus && (!data.stateId || !states.data?.some((state) => state.id === data.stateId))) {
      setError("Selecciona un estado inicial válido del bus.");
      return;
    }
    if (!selectedType || (!selectedType.active && selectedType.id !== bus?.busTypeId)) {
      setError("Selecciona un tipo de bus activo del catálogo.");
      return;
    }
    if (!validSeats || capacity > rows * columns) {
      setError("La distribución debe tener espacio para la capacidad del tipo de bus.");
      return;
    }
    const validation = !bus || photo ? fleetPhotoError(photo) : null;
    setPhotoError(validation);
    if (validation) return;
    const edit = bus
      ? UpdateBusSchema.safeParse({
          branchId: branch.id,
          plateNumber: data.plateNumber,
          brand: data.brand,
          color: data.color,
          model: data.model,
          yearManufacture: data.year_manufacture,
          seatRows: data.seatRows,
          seatColumns: data.seatColumns,
          capacity,
          busTypeId: data.busTypeId,
          rentalEnabled: data.rentalEnabled,
        })
      : null;
    if (edit && !edit.success) {
      setError(edit.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    active.current = true;
    setBusy(true);
    setError("");
    let ambiguous = true;
    try {
      const body = new FormData();
      body.append(
        bus ? "data" : "request",
        new Blob([JSON.stringify(edit?.success ? edit.data : data)], { type: "application/json" }),
        "request.json",
      );
      if (photo) body.append("photo", photo);
      const result = await fetch(
        bus ? `/api/branch-admin/buses/${bus.id}` : "/api/branch-admin/buses",
        {
          method: bus ? "PUT" : "POST",
          body,
        },
      );
      ambiguous = result.ok || result.status >= 500;
      const response = await readFleetResponse(result);
      if (bus) {
        const item = BusListRecordSchema.safeParse(
          response && typeof response === "object" && "item" in response ? response.item : null,
        );
        if (
          !item.success ||
          item.data.id !== bus.id ||
          !response ||
          typeof response !== "object" ||
          !("branchId" in response) ||
          response.branchId !== branch.id
        )
          throw new Error(
            "No se pudo confirmar la actualización. Revisa el listado antes de volver a guardar.",
          );
        onSaved?.(item.data);
        return;
      }
      const parsed = CreatedBusSchema.safeParse(
        response && typeof response === "object" && "bus" in response ? response.bus : null,
      );
      if (!parsed.success)
        throw new Error(
          "No se pudo confirmar el alta del bus. Verifica el registro antes de volver a crearlo.",
        );
      setCreated(parsed.data);
    } catch (cause) {
      setUncertain(ambiguous);
      setError(cause instanceof Error ? cause.message : "No se pudo confirmar el alta del bus.");
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  if (created)
    return (
      <section className="space-y-5 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7 md:p-9">
        <CircleCheck size={32} className="text-[var(--tg-green)]" aria-hidden="true" />
        <h2 className="text-2xl font-semibold">Bus creado</h2>
        <BusPhoto
          src={created.photo}
          alt={`Bus con placa ${created.plateNumber}`}
          className="h-44 w-full max-w-lg"
        />
        <p role="status">
          El bus con placa {created.plateNumber} fue registrado en {branch.name}.
        </p>
        <p className="text-sm text-[var(--tg-muted)]">
          {created.brand} · Modelo {created.model} · {created.capacity} asientos
        </p>
        <Button
          type="button"
          onClick={() => {
            setCreated(null);
            setPhoto(null);
            setPhotoError(null);
            reset({
              branchId: branch.id,
              plateNumber: "",
              brand: "",
              color: "",
              model: "",
              year_manufacture: Number.NaN,
              currentKm: Number.NaN,
              seatRows: Number.NaN,
              seatColumns: Number.NaN,
              busTypeId: Number.NaN,
              rentalEnabled: false,
            });
          }}
        >
          Crear otro bus
        </Button>
      </section>
    );
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8">
        <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold">
          <BusFront size={23} className="text-[var(--tg-green)]" aria-hidden="true" />
          {bus ? "Editar datos del bus" : "Crear bus"}
        </h2>
        <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
          <fieldset disabled={busy || uncertain} className="grid gap-5 sm:grid-cols-2">
            {!bus && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bus-state">Estado inicial</Label>
                <select
                  id="bus-state"
                  disabled={states.loading || !!states.error}
                  className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3"
                  {...register("stateId", { valueAsNumber: true })}
                >
                  <option value="">Selecciona un estado</option>
                  {states.data?.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {states.error && (
                  <p role="alert">
                    {states.error}{" "}
                    <button type="button" className="underline" onClick={states.refresh}>
                      Consultar estados nuevamente
                    </button>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bus-type">Tipo de bus</Label>
              <select
                id="bus-type"
                value={Number.isFinite(typeId) ? String(typeId) : ""}
                disabled={types.loading || !!types.error}
                className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3"
                {...register("busTypeId", { valueAsNumber: true })}
              >
                <option value="">{types.loading ? "Cargando tipos…" : "Selecciona un tipo"}</option>
                {types.data
                  ?.filter((type) => type.active || type.id === bus?.busTypeId)
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} · {type.capacity} pasajeros{type.active ? "" : " (inactivo)"}
                    </option>
                  ))}
              </select>
              {formState.errors.busTypeId && (
                <p role="alert" className="text-sm text-red-600">
                  Selecciona un tipo de bus.
                </p>
              )}
              {types.error && (
                <p role="alert">
                  {types.error}{" "}
                  <button type="button" className="underline" onClick={types.refresh}>
                    Consultar tipos nuevamente
                  </button>
                </p>
              )}
              {!types.loading && !types.error && types.data?.length === 0 && (
                <p role="status">El administrador debe registrar tipos de bus para continuar.</p>
              )}
            </div>
            {fields
              .filter((field) => !bus || field.name !== "currentKm")
              .map((field) => (
                <FleetField
                  key={field.name}
                  id={"bus-" + field.name}
                  label={field.label}
                  type={field.numeric ? "number" : "text"}
                  min={field.min}
                  max={field.max}
                  maxLength={field.maxLength}
                  step={field.numeric ? 1 : undefined}
                  required
                  autoComplete="off"
                  error={getFieldState(field.name, formState).error}
                  {...register(field.name, field.numeric ? { valueAsNumber: true } : {})}
                />
              ))}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bus-capacity">Capacidad de pasajeros</Label>
              <Input
                id="bus-capacity"
                type="text"
                min={1}
                step={1}
                readOnly
                value={capacity || ""}
              />
              <p className="text-xs text-[var(--tg-muted)]">
                La capacidad corresponde al tipo seleccionado y debe caber en la distribución.
              </p>
            </div>
          </fieldset>
          <label className="mt-5 flex items-center gap-3 text-sm">
            <input type="checkbox" disabled={busy || uncertain} {...register("rentalEnabled")} />{" "}
            Habilitado para alquiler privado
          </label>
          <div className="mt-6">
            <BusPhotoInput
              required={!bus}
              currentPhoto={bus?.photo}
              photo={photo}
              onChange={(file) => {
                setPhoto(file);
                setPhotoError(file ? fleetPhotoError(file) : null);
              }}
              error={photoError}
              disabled={busy || uncertain}
            />
          </div>
          {error && (
            <p role="alert" className="mt-5 rounded-lg border border-red-300 p-4 text-sm">
              {error}
            </p>
          )}
          {uncertain && (
            <p className="mt-4 text-sm text-[var(--tg-muted)]">
              La operación podría haberse registrado.{" "}
              <Link href="/branch-admin/buses" className="underline underline-offset-4">
                Verifica el listado de buses antes de volver a guardar.
              </Link>
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || uncertain || types.loading || !!types.error}
            className="mt-7 w-full sm:w-auto"
          >
            {busy ? (bus ? "Guardando…" : "Creando bus…") : bus ? "Guardar cambios" : "Crear bus"}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="mt-3 w-full sm:ml-3 sm:w-auto"
              onClick={onCancel}
            >
              Cerrar
            </Button>
          )}
        </form>
      </section>
      <aside className="rounded-2xl bg-[#16383e] p-6 text-[#eef6ed]">
        <h2 className="text-lg font-semibold">Distribución de asientos</h2>
        <p className="mt-3 text-sm leading-6 text-[#b9d2bc]">
          {validSeats
            ? `${rows} filas × ${columns} columnas: ${capacity} asientos.`
            : "Ingresa las filas y columnas para ver la capacidad del bus."}
        </p>
        {validSeats && (
          <div
            className="mt-5 grid max-h-64 gap-2 overflow-y-auto"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            aria-label="Vista previa de la distribución de asientos"
          >
            {Array.from({ length: Math.min(capacity, rows * columns) }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className="rounded-md border border-white/25 py-1 text-center text-xs"
              >
                {index + 1}
              </span>
            ))}
          </div>
        )}
        <p className="mt-5 border-t border-white/15 pt-5 text-xs leading-6 text-[#b9d2bc]">
          {bus ? `Bus de ${branch.name}.` : `El bus se registrará en ${branch.name}.`}
        </p>
      </aside>
    </div>
  );
}
