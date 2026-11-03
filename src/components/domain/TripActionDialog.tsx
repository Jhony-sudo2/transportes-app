"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTransportMutation } from "@/hooks/useTransportMutation";
import { guatemalaDateTime, inputToInstant } from "@/lib/transport-time";
import {
  TripDepartureSchema,
  TripArrivalSchema,
  TripDriverUpdateSchema,
  TripCancellationSchema,
  TripRecordSchema,
  TripCancellationResultSchema,
} from "@/lib/validators/journey";
import { driverAvailability } from "@/lib/fleet-availability";
import type { TripRecord } from "@/types/journey";
import type { DriverListRecord } from "@/types/fleet";
type Action = "departure" | "arrival" | "cancel" | "driver";
const titles: Record<Action, string> = {
  departure: "Registrar salida",
  arrival: "Registrar llegada",
  cancel: "Cancelar viaje",
  driver: "Reasignar chofer",
};
const numeric = (value: string) => (value.trim() ? Number(value) : Number.NaN);
export function TripActionDialog({
  trip,
  action,
  actor,
  branchId,
  drivers = [],
  onSaved,
  pathBase,
}: {
  trip: Pick<TripRecord, "tripId" | "driverId"> & {
    departure?: TripRecord["departure"] | undefined;
    driverBaseSalarySnapshot?: TripRecord["driverBaseSalarySnapshot"] | undefined;
  };
  action: Action;
  actor: "branch" | "driver";
  branchId?: number | undefined;
  drivers?: DriverListRecord[];
  onSaved: (notice: string) => void;
  pathBase?: string;
}) {
  const [open, setOpen] = useState(false),
    [at, setAt] = useState(guatemalaDateTime()),
    [km, setKm] = useState(""),
    [fuel, setFuel] = useState(""),
    [reason, setReason] = useState(""),
    [driverId, setDriverId] = useState(String(trip.driverId ?? "")),
    [salary, setSalary] = useState(""),
    [validation, setValidation] = useState("");
  const mutation = useTransportMutation();
  function changeOpen(next: boolean) {
    if (mutation.sending.current) return;
    if (next) {
      mutation.reset();
      setAt(guatemalaDateTime());
      setKm("");
      setFuel("");
      setReason("");
      setValidation("");
      setDriverId(String(trip.driverId ?? ""));
      setSalary(trip.driverBaseSalarySnapshot == null ? "" : String(trip.driverBaseSalarySnapshot));
    }
    if (!next && mutation.error) onSaved("Estado consultado nuevamente.");
    setOpen(next);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input: unknown =
      action === "departure"
        ? { actualDepartureAt: inputToInstant(at), startKm: numeric(km) }
        : action === "arrival"
          ? { actualArrivalAt: inputToInstant(at), endKm: numeric(km), fuelCost: numeric(fuel) }
          : action === "cancel"
            ? { reason }
            : {
                driverId: Number(driverId),
                ...(salary.trim() ? { driverBaseSalary: numeric(salary) } : {}),
              };
    const parsed = (
      action === "departure"
        ? TripDepartureSchema
        : action === "arrival"
          ? TripArrivalSchema
          : action === "cancel"
            ? TripCancellationSchema
            : TripDriverUpdateSchema
    ).safeParse(input);
    if (!parsed.success) {
      setValidation(
        "Completa los datos con una fecha válida y valores no negativos; indica un motivo o chofer cuando corresponda.",
      );
      return;
    }
    if (
      action === "arrival" &&
      trip.departure &&
      (numeric(km) < trip.departure.startKm ||
        Date.parse(inputToInstant(at)) < Date.parse(trip.departure.actualDepartureAt))
    ) {
      setValidation(
        "La llegada no puede ser anterior a la salida ni el kilometraje final menor al inicial.",
      );
      return;
    }
    setValidation("");
    const path = `${pathBase ?? `/api/${actor === "branch" ? "branch-admin" : "driver"}/trips`}/${trip.tripId}/${action}${actor === "branch" ? `?branchId=${branchId}` : ""}`;
    if (action === "cancel") {
      const result = await mutation.run(path, parsed.data, TripCancellationResultSchema);
      if (result) {
        setOpen(false);
        onSaved(
          result.status === "CANCELLING"
            ? "Cancelación en proceso. Consulta el estado hasta que se confirme."
            : "Viaje cancelado.",
        );
      }
    } else {
      const result = await mutation.run(path, parsed.data, TripRecordSchema);
      if (result) {
        setOpen(false);
        onSaved(
          action === "departure"
            ? "Salida registrada."
            : action === "arrival"
              ? "Llegada registrada. El viaje fue finalizado."
              : "Chofer actualizado; el bus y la ruta se conservan.",
        );
      }
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={action === "cancel" ? "destructive" : "outline"}
          disabled={mutation.busy}
        >
          {titles[action]}
          <span className="sr-only"> del viaje #{trip.tripId}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="transport-dialog max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {titles[action]} · #{trip.tripId}
          </DialogTitle>
          <DialogDescription>
            {action === "cancel"
              ? "La cancelación requiere un motivo. Las devoluciones se consultan por separado."
              : action === "driver"
                ? "Selecciona un chofer habilitado de la misma sucursal. Se verificarán su licencia y horarios."
                : "Revisa y confirma los datos reales. La salida y llegada quedan registradas de forma permanente."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
          <fieldset disabled={mutation.busy || mutation.uncertain} className="space-y-4">
            {(action === "departure" || action === "arrival") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`trip-at-${trip.tripId}-${action}`}>
                    Fecha y hora real (Guatemala)
                  </Label>
                  <Input
                    id={`trip-at-${trip.tripId}-${action}`}
                    type="datetime-local"
                    value={at}
                    onChange={(event) => setAt(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`trip-km-${trip.tripId}-${action}`}>
                    {action === "departure" ? "Kilometraje inicial" : "Kilometraje final"}
                  </Label>
                  <Input
                    id={`trip-km-${trip.tripId}-${action}`}
                    type="number"
                    min={action === "arrival" ? (trip.departure?.startKm ?? 0) : 0}
                    step={1}
                    value={km}
                    onChange={(event) => setKm(event.target.value)}
                  />
                </div>
                {action === "arrival" && (
                  <>
                    <p className="text-sm">
                      Kilometraje de salida: {trip.departure?.startKm ?? "Sin confirmar"}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor={`trip-fuel-${trip.tripId}`}>
                        Gasto real de combustible (Q)
                      </Label>
                      <Input
                        id={`trip-fuel-${trip.tripId}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={fuel}
                        onChange={(event) => setFuel(event.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            {action === "cancel" && (
              <div className="space-y-2">
                <Label htmlFor={`trip-reason-${trip.tripId}`}>Motivo de cancelación</Label>
                <textarea
                  id={`trip-reason-${trip.tripId}`}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-28 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] p-3"
                />
              </div>
            )}
            {action === "driver" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`trip-driver-${trip.tripId}`}>Chofer del viaje</Label>
                  <select
                    id={`trip-driver-${trip.tripId}`}
                    value={driverId}
                    onChange={(event) => setDriverId(event.target.value)}
                    className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3"
                  >
                    <option value="">Selecciona un chofer</option>
                    {drivers
                      .filter((driver) => driverAvailability(driver).active === true)
                      .map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} {driver.lastName}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`trip-salary-${trip.tripId}`}>
                    Salario base de este viaje (Q, opcional)
                  </Label>
                  <Input
                    id={`trip-salary-${trip.tripId}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={salary}
                    onChange={(event) => setSalary(event.target.value)}
                  />
                </div>
              </>
            )}
          </fieldset>
          {validation && <p role="alert">{validation}</p>}
          {mutation.error && (
            <p role="alert" className="tg-notice">
              {mutation.error}
            </p>
          )}
          {mutation.uncertain && (
            <p className="text-sm">
              El resultado es incierto. Cierra esta ventana y consulta el estado antes de enviar
              otra operación.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.busy}
              onClick={() => changeOpen(false)}
            >
              Cerrar
            </Button>
            <Button type="submit" disabled={mutation.busy || mutation.uncertain}>
              {mutation.busy ? "Enviando…" : "Confirmar datos"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
