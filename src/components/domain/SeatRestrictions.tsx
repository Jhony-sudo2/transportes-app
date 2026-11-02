"use client";
import { useState } from "react";
import { z } from "zod";
import { useCustomerData } from "@/hooks/useCustomerData";
import { RestrictionInputSchema, RestrictionResultSchema } from "@/lib/validators/commerce";
import { TripListSchema } from "@/lib/validators/journey";
import { BusListSchema } from "@/lib/validators/fleet-resources";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const contextSchema = z.object({ trips: TripListSchema, buses: BusListSchema });
export function SeatRestrictions({
  userId,
  branchId,
  canBlockBus = false,
}: {
  userId: number;
  branchId?: number;
  canBlockBus?: boolean;
}) {
  const query = branchId ? `?branchId=${branchId}` : "",
    context = useCustomerData(`/api/commerce/restrictions/context${query}`, contextSchema),
    [scope, setScope] = useState<"TRIP" | "BUS">("TRIP"),
    [selected, setSelected] = useState(0),
    [removeId, setRemoveId] = useState(""),
    [notice, setNotice] = useState("");
  const options =
    scope === "BUS"
      ? context.data?.buses.map((b) => ({ value: String(b.id), label: b.plateNumber }))
      : context.data?.trips
          .filter((t) => t.status === "SCHEDULED")
          .map((t) => ({
            value: String(t.tripId),
            label: `Viaje #${t.tripId} · ${t.scheduledDepartureAt}`,
          }));
  return (
    <div className="space-y-6">
      <CustomerDataState loading={context.loading} error={context.error} retry={context.refresh} />
      <p>
        Un bloqueo impide nuevas ventas; los boletos comprados necesitan atención por reasignación o
        cancelación autorizada. Un bloqueo de bus se aplica también a sus próximos viajes.
      </p>
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Alcance
          <select
            className="h-12 w-full rounded-lg border bg-[var(--tg-paper)] px-3"
            value={scope}
            aria-label="Alcance"
            onChange={(e) => {
              setScope(e.target.value as "TRIP" | "BUS");
              setSelected(0);
            }}
          >
            <option value="TRIP">Un viaje de mi sucursal</option>
            {canBlockBus && <option value="BUS">Bus de mi sucursal</option>}
          </select>
        </label>
        <label>
          {scope === "BUS" ? "Bus" : "Viaje"}
          <select
            className="h-12 w-full rounded-lg border bg-[var(--tg-paper)] px-3"
            value={selected}
            aria-label={scope === "BUS" ? "Bus" : "Viaje"}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            <option value={0}>Selecciona una opción</option>
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected > 0 && (
        <>
          <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5">
            <h2 className="text-xl font-semibold">Crear bloqueo comercial</h2>
            <OperationForm
              key={`${scope}:${selected}`}
              scope={`restriction:${userId}:${scope}:${selected}`}
              path={`/api/commerce/restrictions${query}`}
              schema={RestrictionInputSchema}
              resultSchema={RestrictionResultSchema}
              base={{ scopeType: scope, scopeId: selected }}
              fields={[
                { name: "seatRow", label: "Fila", type: "number", min: 1, step: "1" },
                { name: "seatColumn", label: "Asiento", type: "number", min: 1, step: "1" },
                { name: "reason", label: "Motivo del bloqueo", type: "textarea" },
              ]}
              label="Confirmar bloqueo de asiento"
              onSaved={(r) => {
                setNotice(
                  `Bloqueo #${r.restrictionId} habilitado. Conserva su número para consultarlo o deshabilitarlo.`,
                );
                setRemoveId(String(r.restrictionId));
              }}
            />
          </section>
          <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5">
            <h2 className="text-xl font-semibold">Deshabilitar bloqueo</h2>
            <Label htmlFor="restriction-remove">Número del bloqueo existente</Label>
            <Input
              id="restriction-remove"
              type="number"
              min={1}
              step="1"
              value={removeId}
              onChange={(e) => setRemoveId(e.target.value)}
            />
            {Number(removeId) > 0 && (
              <OperationForm
                scope={`restriction-remove:${userId}:${removeId}`}
                path={`/api/commerce/restrictions/${Number(removeId)}/deactivate${query}`}
                method="PATCH"
                schema={RestrictionInputSchema.pick({ scopeType: true, scopeId: true }).strict()}
                resultSchema={RestrictionResultSchema}
                base={{ scopeType: scope, scopeId: selected }}
                fields={[]}
                label="Confirmar desbloqueo"
                onSaved={() =>
                  setNotice(
                    "Bloqueo deshabilitado. Consulta nuevamente la disponibilidad antes de vender.",
                  )
                }
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
