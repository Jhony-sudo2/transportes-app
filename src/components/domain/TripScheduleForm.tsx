"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTransportMutation } from "@/hooks/useTransportMutation";
import { TripScheduleInputSchema, TripRecordSchema } from "@/lib/validators/journey";
import { busAvailability, driverAvailability } from "@/lib/fleet-availability";
import { guatemalaDateTime, inputToInstant } from "@/lib/transport-time";
import type { JourneyWorkspace } from "@/types/journey";
const selectClass =
  "h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm";
export function TripScheduleForm({
  workspace,
  onSaved,
  onClose,
}: {
  workspace: JourneyWorkspace;
  onSaved: () => void;
  onClose: () => void;
}) {
  const mutation = useTransportMutation();
  const [salary, setSalary] = useState("");
  const [validation, setValidation] = useState("");
  const name = (id: number) =>
    workspace.branches.find((branch) => branch.id === id)?.name ?? `Sucursal #${id}`;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = TripScheduleInputSchema.safeParse({
      routeId: Number(form.get("routeId")),
      busId: Number(form.get("busId")),
      driverId: Number(form.get("driverId")),
      scheduledDepartureAt: inputToInstant(String(form.get("departure"))),
      scheduledArrivalAt: inputToInstant(String(form.get("arrival"))),
      ...(salary.trim() ? { driverBaseSalary: Number(salary) } : {}),
    });
    if (!input.success) {
      setValidation(
        "Selecciona ruta, bus y chofer. La llegada prevista debe ser posterior a la salida; el salario no puede ser negativo.",
      );
      return;
    }
    setValidation("");
    const result = await mutation.run(
      `/api/branch-admin/trips?branchId=${workspace.branchId}`,
      input.data,
      TripRecordSchema,
    );
    if (result) onSaved();
  }
  return (
    <section className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6">
      <h2 className="mb-5 text-xl font-semibold">Programar viaje regular</h2>
      <form noValidate onSubmit={(event) => void save(event)} className="space-y-5">
        <fieldset
          disabled={mutation.busy || mutation.uncertain}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="schedule-route">Ruta</Label>
            <select id="schedule-route" name="routeId" className={selectClass}>
              <option value="">Selecciona una ruta</option>
              {workspace.routes.map((route) => (
                <option key={route.routeId} value={route.routeId}>
                  {name(route.originBranchId)} → {name(route.destinationBranchId)} · Q
                  {route.ticketPrice.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-bus">Bus</Label>
            <select
              id="schedule-bus"
              name="busId"
              className={selectClass}
              onChange={(event) => {
                const bus = workspace.buses.find((item) => item.id === Number(event.target.value));
                const type = workspace.busTypes.find((item) => item.id === bus?.busTypeId);
                setSalary(type ? String(type.suggestedDriverSalaryPerTrip) : "");
              }}
            >
              <option value="">Selecciona un bus</option>
              {workspace.buses
                .filter((bus) => busAvailability(bus).active === true)
                .map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.plateNumber} · {bus.capacity ?? "—"} pasajeros
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-driver">Chofer</Label>
            <select id="schedule-driver" name="driverId" className={selectClass}>
              <option value="">Selecciona un chofer</option>
              {workspace.drivers
                .filter((driver) => driverAvailability(driver).active === true)
                .map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} {driver.lastName}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-departure">Salida prevista (Guatemala)</Label>
            <Input
              id="schedule-departure"
              name="departure"
              type="datetime-local"
              defaultValue={guatemalaDateTime()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-arrival">Llegada prevista (Guatemala)</Label>
            <Input
              id="schedule-arrival"
              name="arrival"
              type="datetime-local"
              defaultValue={guatemalaDateTime(new Date(Date.now() + 3600000))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="schedule-salary">Salario base del viaje (Q, opcional)</Label>
            <Input
              id="schedule-salary"
              type="number"
              min={0}
              step="0.01"
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
            />
            <p className="text-xs text-[var(--tg-muted)]">
              Sugerido por el tipo de bus; puedes ajustarlo antes de la salida. El servicio congela
              el importe del viaje.
            </p>
          </div>
        </fieldset>
        <p className="text-sm text-[var(--tg-muted)]">
          La habilitación no garantiza disponibilidad de horario. Al confirmar se revisan
          solapamientos y licencia.
        </p>
        {validation && <p role="alert">{validation}</p>}
        {mutation.error && (
          <p role="alert" className="tg-notice">
            {mutation.error}
          </p>
        )}
        {mutation.uncertain && <p>Consulta el listado de viajes antes de volver a programar.</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.busy || mutation.uncertain}>
            {mutation.busy ? "Programando…" : "Confirmar programación"}
          </Button>
          <Button type="button" variant="outline" disabled={mutation.busy} onClick={onClose}>
            Cerrar formulario
          </Button>
        </div>
      </form>
    </section>
  );
}
