"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CustomerDataState } from "./CustomerDataState";
import { TripActionDialog } from "./TripActionDialog";
import { TripScheduleForm } from "./TripScheduleForm";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { TripListSchema, JourneyWorkspaceSchema } from "@/lib/validators/journey";
import { displayInstant } from "@/lib/transport-time";
import type { TripStatus, TripRecord, JourneyWorkspace } from "@/types/journey";
const labels: Record<TripStatus, string> = {
  SCHEDULED: "Programado",
  CANCELLING: "Cancelación en proceso",
  CANCELLED: "Cancelado",
  IN_TRANSIT: "En tránsito",
  COMPLETED: "Finalizado",
};
export function JourneyTripsClient({
  branchId,
  actor = "branch",
  privateTrips = false,
}: {
  branchId?: number;
  actor?: "branch" | "driver";
  privateTrips?: boolean;
}) {
  const resource = useCustomerData(
    actor === "driver"
      ? "/api/driver/trips"
      : privateTrips
        ? `/api/rentals/operating-trips?branchId=${branchId}`
        : `/api/branch-admin/trips?branchId=${branchId}`,
    TripListSchema,
  );
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const { busy } = useBranchWorkspace();
  const saved = (message: string) => {
    setNotice(message);
    resource.refresh();
  };
  const content = (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="trips-status">Estado del viaje</Label>
          <select
            id="trips-status"
            className="h-12 rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" disabled={busy || resource.loading} onClick={resource.refresh}>
          Consultar estado de viajes
        </Button>
      </div>
      <CustomerDataState
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {resource.data?.length === 0 && <p>No hay viajes para mostrar.</p>}
    </>
  );
  if (privateTrips && branchId !== undefined)
    return (
      <div className="space-y-5">
        {content}
        <TripCards
          trips={resource.data}
          status={status}
          saved={saved}
          actor="branch"
          branchId={branchId}
        />
      </div>
    );
  return actor === "branch" && branchId !== undefined ? (
    <BranchTrips
      branchId={branchId}
      trips={resource.data}
      status={status}
      saved={saved}
      content={content}
    />
  ) : (
    <div className="space-y-6">
      {content}
      <TripCards trips={resource.data} status={status} saved={saved} actor="driver" />
    </div>
  );
}
function BranchTrips({
  branchId,
  trips,
  status,
  saved,
  content,
}: {
  branchId: number;
  trips: TripRecord[] | null;
  status: string;
  saved: (message: string) => void;
  content: React.ReactNode;
}) {
  const workspace = useCustomerData(
    `/api/branch-admin/journey-context?branchId=${branchId}`,
    JourneyWorkspaceSchema,
  );
  const [creating, setCreating] = useState(false);
  const { busy } = useBranchWorkspace();
  return (
    <div className="space-y-6">
      <Button disabled={busy || !workspace.data} onClick={() => setCreating(true)}>
        Programar viaje
      </Button>
      {workspace.error && (
        <p role="alert">
          {workspace.error}{" "}
          <button className="underline" onClick={workspace.refresh}>
            Consultar recursos
          </button>
        </p>
      )}
      {creating && workspace.data && (
        <TripScheduleForm
          workspace={workspace.data}
          onSaved={() => {
            setCreating(false);
            saved("Viaje programado.");
          }}
          onClose={() => {
            setCreating(false);
            saved("Consulta los viajes antes de enviar otra solicitud.");
          }}
        />
      )}
      {content}
      <TripCards
        trips={trips}
        status={status}
        saved={saved}
        actor="branch"
        branchId={branchId}
        workspace={workspace.data}
      />
    </div>
  );
}
function TripCards({
  trips,
  status,
  saved,
  actor,
  branchId,
  workspace,
}: {
  trips: TripRecord[] | null;
  status: string;
  saved: (message: string) => void;
  actor: "branch" | "driver";
  branchId?: number;
  workspace?: JourneyWorkspace | null;
}) {
  const name = (id: number) =>
    workspace?.branches.find((branch) => branch.id === id)?.name ?? `Sucursal #${id}`;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {trips
        ?.filter((trip) => !status || trip.status === status)
        .map((trip) => (
          <article
            key={trip.tripId}
            className="space-y-4 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">
                Viaje #{trip.tripId} ·{" "}
                {trip.tripType === "REGULAR" ? "Regular" : `Privado · alquiler #${trip.rentalId}`}
              </h2>
              <span className="rounded-full border border-[var(--tg-line)] px-3 py-1 text-xs">
                {labels[trip.status]}
              </span>
            </div>
            {trip.route && (
              <p>
                {name(trip.route.originBranchId)} → {name(trip.route.destinationBranchId)}
              </p>
            )}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt>Salida prevista</dt>
                <dd>{displayInstant(trip.scheduledDepartureAt)}</dd>
              </div>
              <div>
                <dt>Llegada prevista</dt>
                <dd>{displayInstant(trip.scheduledArrivalAt)}</dd>
              </div>
              <div>
                <dt>Bus</dt>
                <dd>
                  {workspace?.buses.find((bus) => bus.id === trip.busId)?.plateNumber ??
                    `#${trip.busId ?? "Sin asignar"}`}
                </dd>
              </div>
              <div>
                <dt>Chofer</dt>
                <dd>
                  {workspace?.drivers.find((driver) => driver.id === trip.driverId)?.name ??
                    `#${trip.driverId ?? "Sin asignar"}`}
                </dd>
              </div>
              {trip.price !== null && (
                <div>
                  <dt>Precio del boleto</dt>
                  <dd>Q{trip.price.toFixed(2)}</dd>
                </div>
              )}
              {trip.departure && (
                <div>
                  <dt>Salida real</dt>
                  <dd>
                    {displayInstant(trip.departure.actualDepartureAt)} · {trip.departure.startKm} km
                  </dd>
                </div>
              )}
              {trip.arrival && (
                <div>
                  <dt>Llegada real</dt>
                  <dd>
                    {displayInstant(trip.arrival.actualArrivalAt)} · {trip.arrival.endKm} km ·
                    Combustible Q{trip.arrival.fuelCost.toFixed(2)}
                  </dd>
                </div>
              )}
            </dl>
            {trip.status === "CANCELLING" && (
              <p role="status" className="tg-notice">
                Cancelación en proceso. Consulta el estado en unos minutos.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {trip.status === "SCHEDULED" && (
                <>
                  {actor === "branch" && trip.tripType === "REGULAR" && (
                    <>
                      <TripActionDialog
                        trip={trip}
                        action="cancel"
                        actor={actor}
                        branchId={branchId}
                        onSaved={saved}
                      />
                      {workspace && (
                        <TripActionDialog
                          trip={trip}
                          action="driver"
                          actor={actor}
                          branchId={branchId}
                          drivers={workspace.drivers}
                          onSaved={saved}
                        />
                      )}
                    </>
                  )}
                  {trip.busId && trip.driverId && (
                    <TripActionDialog
                      trip={trip}
                      action="departure"
                      {...(actor === "branch" && trip.tripType === "PRIVATE"
                        ? { pathBase: `/api/rentals/contracts/${trip.rentalId}/legs` }
                        : {})}
                      actor={actor}
                      branchId={branchId}
                      onSaved={saved}
                    />
                  )}
                </>
              )}
              {trip.status === "IN_TRANSIT" && (
                <TripActionDialog
                  trip={trip}
                  action="arrival"
                  {...(actor === "branch" && trip.tripType === "PRIVATE"
                    ? { pathBase: `/api/rentals/contracts/${trip.rentalId}/legs` }
                    : {})}
                  actor={actor}
                  branchId={branchId}
                  onSaved={saved}
                />
              )}
            </div>
          </article>
        ))}
    </div>
  );
}
