import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBranchWorkspace, validatedFleetResult } from "@/lib/api/branch-workspace";
import { fleetRequest } from "@/lib/api/fleet";
import { ManagedBranchChoiceSchema } from "@/lib/validators/branch-context";
import { DriverOperationReferenceSchema } from "@/lib/validators/fleet-resources";
import { ApplicationError } from "@/types/error";
import { CreateBusForm } from "./CreateBusForm";
import { CreateDriverForm } from "./CreateDriverForm";
import { FleetListClient } from "./FleetListClient";
type Props = {
  kind: "bus" | "driver";
  view?: "create" | "list";
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
export async function FleetCreatePage({ kind, view = "create", searchParams }: Props) {
  const listPath = kind === "bus" ? "/sucursal/buses" : "/sucursal/choferes";
  const title =
    view === "list"
      ? kind === "bus"
        ? "Buses de tu sucursal."
        : "Choferes de tu sucursal."
      : kind === "bus"
        ? "Un nuevo bus para tu sucursal."
        : "Un nuevo chofer para el equipo.";
  try {
    const { token, branchId } = await getBranchWorkspace();
    let branch = null;
    if (branchId !== null) {
      branch = validatedFleetResult(
        ManagedBranchChoiceSchema,
        await fleetRequest(`branches/${branchId}`, token),
      );
      if (branch.id !== branchId)
        throw new ApplicationError(
          "system.internal_error",
          502,
          "No se pudo confirmar la sucursal seleccionada.",
        );
    }
    const query = searchParams ? await searchParams : {};
    const reference = DriverOperationReferenceSchema.safeParse({
      driverId: Number(query["driverId"]),
      branchId: Number(query["branchId"]),
      operationId: query["operationId"],
    });
    return (
      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <p className="tg-eyebrow">
          ADMINISTRACIÓN DE SUCURSAL / {kind === "bus" ? "BUSES" : "CHOFERES"}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          {branch && (
            <Button asChild variant={view === "list" ? "default" : "outline"}>
              <Link href={view === "list" ? listPath + "/nuevo" : listPath}>
                {view === "list"
                  ? kind === "bus"
                    ? "Crear bus"
                    : "Crear chofer"
                  : kind === "bus"
                    ? "Ver buses"
                    : "Ver choferes"}
              </Link>
            </Button>
          )}
        </div>
        <p className="mb-8 mt-3 text-sm leading-6 text-[var(--tg-muted)]">
          {branch
            ? `Sucursal: ${branch.name}`
            : "Elige una sucursal asignada en la barra superior para comenzar."}
        </p>
        {branch ? (
          view === "list" ? (
            <FleetListClient key={kind + "-" + branch.id} kind={kind} branch={branch} />
          ) : kind === "bus" ? (
            <CreateBusForm key={branch.id} branch={branch} />
          ) : (
            <CreateDriverForm
              key={branch.id}
              branch={branch}
              initialOperation={
                reference.success && reference.data.branchId === branch.id ? reference.data : null
              }
            />
          )
        ) : (
          <p className="tg-notice" role="status">
            Selecciona la sucursal que vas a administrar para consultar y registrar su flota.
          </p>
        )}
      </section>
    );
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 401) redirect("/login");
    if (error instanceof ApplicationError && error.status === 403) notFound();
    return (
      <section className="mx-auto max-w-3xl space-y-4 px-5 py-12">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p role="alert">No se pudo cargar la sucursal seleccionada. Inténtalo nuevamente.</p>
        <Link href={view === "list" ? listPath : listPath + "/nuevo"} className="underline">
          Reintentar
        </Link>
      </section>
    );
  }
}
