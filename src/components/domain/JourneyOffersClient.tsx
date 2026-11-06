"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerData } from "@/hooks/useCustomerData";
import { ManagedBranchChoiceSchema } from "@/lib/validators/branch-context";
import { TripOffersSchema } from "@/lib/validators/journey";
import { guatemalaDate, displayInstant } from "@/lib/transport-time";
import { CustomerDataState } from "./CustomerDataState";
const branchesSchema = ManagedBranchChoiceSchema.array();
export function JourneyOffersClient({
  checkoutBase = "/customer/trips",
}: {
  checkoutBase?: string;
}) {
  const branches = useCustomerData("/api/journey/branches", branchesSchema);
  const branchName = (id: number) =>
    branches.data?.find((item) => item.id === id)?.name ?? `Sucursal #${id}`;
  const [query, setQuery] = useState(() => `date=${guatemalaDate()}`);
  const offers = useCustomerData(`/api/journey/trips?${query}`, TripOffersSchema);
  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-2xl border border-[var(--tg-line)] p-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const next = new URLSearchParams();
          for (const key of ["originBranchId", "destinationBranchId", "date"]) {
            const value = String(data.get(key) ?? "");
            if (value) next.set(key, value);
          }
          if (next.toString() === query) offers.refresh();
          else setQuery(next.toString());
        }}
      >
        {["originBranchId", "destinationBranchId"].map((key) => (
          <div className="space-y-2" key={key}>
            <Label htmlFor={key}>{key === "originBranchId" ? "Origen" : "Destino"}</Label>
            <select
              id={key}
              name={key}
              className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3"
            >
              <option value="">Todas las sucursales</option>
              {branches.data?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="search-date">Fecha del viaje</Label>
          <Input id="search-date" name="date" type="date" defaultValue={guatemalaDate()} />
        </div>
        <Button className="self-end" disabled={offers.loading}>
          Buscar viajes
        </Button>
      </form>
      <CustomerDataState
        loading={branches.loading}
        error={branches.error}
        retry={branches.refresh}
      />
      <CustomerDataState loading={offers.loading} error={offers.error} retry={offers.refresh} />
      {offers.data?.length === 0 && <p>No hay viajes disponibles para esta búsqueda.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {offers.data?.map((trip) => (
          <article
            key={trip.tripId}
            className="space-y-3 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-5"
          >
            <h2 className="text-lg font-semibold">
              {branchName(trip.originBranchId)} → {branchName(trip.destinationBranchId)}
            </h2>
            <p>{displayInstant(trip.departureAt)}</p>
            <p>
              Q{trip.price.toFixed(2)} por boleto ·{" "}
              {trip.seatsAvailable === null
                ? "Disponibilidad por confirmar"
                : trip.seatsAvailable === 0
                  ? "Sin asientos disponibles"
                  : `${trip.seatsAvailable} ${trip.seatsAvailable === 1 ? "asiento disponible" : "asientos disponibles"}`}
            </p>
            <p className="text-sm text-[var(--tg-muted)]">
              Viaje #{trip.tripId} · Bus #{trip.busId}
            </p>
            {trip.seatsAvailable !== 0 && (
              <Button asChild>
                <Link href={`${checkoutBase}/${trip.tripId}`}>
                  {trip.seatsAvailable === null ? "Consultar asientos" : "Elegir asientos"}
                </Link>
              </Button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
