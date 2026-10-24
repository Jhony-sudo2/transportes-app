"use client";
import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusFront, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FleetField } from "./FleetField";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { readFleetResponse } from "@/lib/fleet-ui";
import {
  BusFormSchema,
  CreatedBusSchema,
  type BusFormData,
  type CreatedBus,
} from "@/lib/validators/fleet-resources";
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
  { name: "model", label: "Modelo (año)", numeric: true, min: 1980, max: 9999 },
  { name: "year_manufacture", label: "Año de fabricación", numeric: true, min: 1, max: 9999 },
  { name: "currentKm", label: "Kilometraje inicial", numeric: true, min: 1, max: 2147483647 },
  { name: "seatRows", label: "Filas de asientos", numeric: true, min: 1, max: 30 },
  { name: "seatColumns", label: "Columnas de asientos", numeric: true, min: 1, max: 6 },
];
export function CreateBusForm({ branch }: { branch: { id: number; name: string } }) {
  const { busy, setBusy } = useBranchWorkspace();
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedBus | null>(null);
  const { register, handleSubmit, getFieldState, formState, watch, reset } = useForm<BusFormData>({
    resolver: zodResolver(BusFormSchema),
    defaultValues: { branchId: branch.id },
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
  const capacity = validSeats ? rows * columns : 0;
  async function submit(data: BusFormData) {
    setBusy(true);
    setError("");
    try {
      const response = await readFleetResponse(
        await fetch("/api/branch-admin/buses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );
      const parsed = CreatedBusSchema.safeParse(
        response && typeof response === "object" && "bus" in response ? response.bus : null,
      );
      if (!parsed.success)
        throw new Error(
          "No se pudo confirmar el alta del bus. Verifica el registro antes de volver a crearlo.",
        );
      setCreated(parsed.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo confirmar el alta del bus.");
    } finally {
      setBusy(false);
    }
  }
  if (created)
    return (
      <section className="space-y-5 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7 md:p-9">
        <CircleCheck size={32} className="text-[var(--tg-green)]" aria-hidden="true" />
        <h2 className="text-2xl font-semibold">Bus creado</h2>
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
            reset({
              branchId: branch.id,
              plateNumber: "",
              brand: "",
              color: "",
              model: Number.NaN,
              year_manufacture: Number.NaN,
              currentKm: Number.NaN,
              seatRows: Number.NaN,
              seatColumns: Number.NaN,
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
          Crear bus
        </h2>
        <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)}>
          <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => (
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
              <Input id="bus-capacity" readOnly value={capacity || ""} />
              <p className="text-xs text-[var(--tg-muted)]">
                Se calcula multiplicando filas por columnas.
              </p>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="mt-5 rounded-lg border border-red-300 p-4 text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="mt-7 w-full sm:w-auto">
            {busy ? "Creando bus…" : "Crear bus"}
          </Button>
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
            {Array.from({ length: capacity }, (_, index) => (
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
          El bus se registrará en {branch.name}.
        </p>
      </aside>
    </div>
  );
}
