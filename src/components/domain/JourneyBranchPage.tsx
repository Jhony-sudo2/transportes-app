import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBranchWorkspace } from "@/lib/api/branch-workspace";
import { ApplicationError } from "@/types/error";
import { JourneyRoutesClient } from "./JourneyRoutesClient";
import { JourneyTripsClient } from "./JourneyTripsClient";

export async function JourneyBranchPage({ view }: { view: "routes" | "trips" }) {
  try {
    const { branchId } = await getBranchWorkspace();
    return (
      <section className="mx-auto max-w-7xl space-y-6 px-5 py-10 md:px-8">
        <p className="tg-eyebrow">OPERACIÓN DE SUCURSAL</p>
        <h1 className="text-3xl font-semibold">
          {view === "routes" ? "Rutas de tu sucursal" : "Viajes de tu sucursal"}
        </h1>
        <nav aria-label="Operación" className="flex gap-5">
          <Link
            className="underline"
            href="/branch-admin/routes"
            aria-current={view === "routes" ? "page" : undefined}
          >
            Rutas
          </Link>
          <Link
            className="underline"
            href="/branch-admin/trips"
            aria-current={view === "trips" ? "page" : undefined}
          >
            Viajes
          </Link>
        </nav>
        {branchId === null ? (
          <p role="status" className="tg-notice">
            Selecciona una sucursal en la barra superior para comenzar.
          </p>
        ) : view === "routes" ? (
          <JourneyRoutesClient key={branchId} branchId={branchId} />
        ) : (
          <JourneyTripsClient key={branchId} branchId={branchId} />
        )}
      </section>
    );
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401) redirect("/login");
    if (error instanceof ApplicationError && error.status === 403) notFound();
    return (
      <section className="mx-auto max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Operación de sucursal</h1>
        <p role="alert">No se pudo consultar la sucursal seleccionada.</p>
        <Link className="underline" href={`/branch-admin/${view}`}>
          Reintentar
        </Link>
      </section>
    );
  }
}
