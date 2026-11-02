"use client";
import { useState } from "react";
import { z } from "zod";
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
} from "@/components/ui/dialog";
import { CustomerDataState } from "./CustomerDataState";
import { BranchMap } from "./BranchMap";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useTransportMutation } from "@/hooks/useTransportMutation";
import { BranchListSchema, getBranchCoordinate } from "@/lib/validators/branch";
import {
  RouteListSchema,
  RegularRouteInputSchema,
  RegularRouteSchema,
} from "@/lib/validators/journey";
import type { RegularRoute, RegularRouteInput } from "@/types/journey";
const selectClass =
  "h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm";
export function JourneyRoutesClient({ branchId }: { branchId: number }) {
  const routes = useCustomerData(`/api/branch-admin/routes?branchId=${branchId}`, RouteListSchema);
  const branches = useCustomerData(
    `/api/branch-admin/route-branches?branchId=${branchId}`,
    BranchListSchema,
  );
  const mutation = useTransportMutation();
  const [editor, setEditor] = useState<RegularRoute | "new" | null>(null);
  const [deleting, setDeleting] = useState<RegularRoute | null>(null);
  const [shown, setShown] = useState<RegularRoute | null>(null);
  const [validation, setValidation] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({ destinationBranchId: "", distanceKm: "", ticketPrice: "" });
  const name = (id: number) =>
    branches.data?.find((branch) => branch.id === id)?.name ?? `Sucursal #${id}`;
  function open(route: RegularRoute | "new") {
    mutation.reset();
    setValidation("");
    setNotice("");
    setEditor(route);
    setDraft(
      route === "new"
        ? { destinationBranchId: "", distanceKm: "", ticketPrice: "" }
        : {
            destinationBranchId: String(route.destinationBranchId),
            distanceKm: String(route.distanceKm),
            ticketPrice: String(route.ticketPrice),
          },
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const input: RegularRouteInput = {
      originBranchId: branchId,
      destinationBranchId: Number(draft.destinationBranchId),
      distanceKm: Number(draft.distanceKm),
      ticketPrice: Number(draft.ticketPrice),
    };
    const parsed = RegularRouteInputSchema.safeParse(input);
    if (!parsed.success || input.destinationBranchId === branchId) {
      setValidation("Selecciona un destino diferente y valores positivos de distancia y tarifa.");
      return;
    }
    const route = editor && editor !== "new" ? editor : null;
    const result = await mutation.run(
      `/api/branch-admin/routes${route ? `/${route.routeId}` : ""}?branchId=${branchId}`,
      parsed.data,
      RegularRouteSchema,
      route ? "PATCH" : "POST",
    );
    if (result) {
      setEditor(null);
      setShown(result);
      setNotice("Ruta guardada.");
      routes.refresh();
    }
  }
  const selectedBranches = shown
    ? (branches.data ?? []).filter((branch) =>
        [shown.originBranchId, shown.destinationBranchId].includes(branch.id),
      )
    : [];
  const origin = selectedBranches.find((branch) => branch.id === shown?.originBranchId);
  const destination = selectedBranches.find((branch) => branch.id === shown?.destinationBranchId);
  const from = origin ? getBranchCoordinate(origin) : null,
    to = destination ? getBranchCoordinate(destination) : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button disabled={mutation.busy || !branches.data} onClick={() => open("new")}>
          Crear ruta
        </Button>
        <Button
          variant="outline"
          disabled={mutation.busy}
          onClick={() => {
            routes.refresh();
            branches.refresh();
          }}
        >
          Actualizar rutas
        </Button>
      </div>
      <CustomerDataState
        loading={routes.loading || branches.loading}
        error={routes.error || branches.error}
        retry={() => {
          routes.refresh();
          branches.refresh();
        }}
      />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {routes.data?.length === 0 && <p>No hay rutas registradas para esta sucursal.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {routes.data?.map((route) => (
          <article
            key={route.routeId}
            className="space-y-4 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-5"
          >
            <h2 className="font-semibold">
              {name(route.originBranchId)} → {name(route.destinationBranchId)}
            </h2>
            <p className="text-sm">
              {route.distanceKm} km · Tarifa Q{route.ticketPrice.toFixed(2)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.busy}
                onClick={() => open(route)}
              >
                Editar ruta #{route.routeId}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShown(route)}>
                Ver recorrido #{route.routeId}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={mutation.busy}
                onClick={() => {
                  mutation.reset();
                  setDeleting(route);
                }}
              >
                Eliminar ruta #{route.routeId}
              </Button>
            </div>
          </article>
        ))}
      </div>
      {shown && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            {name(shown.originBranchId)} → {name(shown.destinationBranchId)}
          </h2>
          <p className="text-sm text-[var(--tg-muted)]">
            Referencia entre las coordenadas de las sucursales. El trazo no representa una ruta vial
            calculada.
          </p>
          <BranchMap
            branches={selectedBranches}
            point={null}
            focus={null}
            segments={
              from && to
                ? [
                    {
                      origin: from,
                      destination: to,
                      label: `${name(shown.originBranchId)} → ${name(shown.destinationBranchId)}`,
                    },
                  ]
                : []
            }
          />
          {(!from || !to) && (
            <p role="status">Faltan coordenadas válidas para representar el recorrido.</p>
          )}
        </section>
      )}
      <Dialog
        open={editor !== null}
        onOpenChange={(next) => {
          if (!mutation.sending.current && !next) {
            setEditor(null);
            routes.refresh();
          }
        }}
      >
        <DialogContent className="transport-dialog max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor === "new" ? "Crear ruta regular" : "Editar ruta regular"}
            </DialogTitle>
            <DialogDescription>
              Origen: {name(branchId)}. Ambas sucursales deben tener coordenadas válidas.
            </DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={(event) => void save(event)} className="space-y-4">
            <fieldset disabled={mutation.busy || mutation.uncertain} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="route-destination">Sucursal de destino</Label>
                <select
                  id="route-destination"
                  className={selectClass}
                  value={draft.destinationBranchId}
                  onChange={(event) =>
                    setDraft({ ...draft, destinationBranchId: event.target.value })
                  }
                >
                  <option value="">Selecciona el destino</option>
                  {branches.data
                    ?.filter((branch) => branch.id !== branchId && branch.active === true)
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-distance">Distancia (km)</Label>
                <Input
                  id="route-distance"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.distanceKm}
                  onChange={(event) => setDraft({ ...draft, distanceKm: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-price">Precio del boleto (Q)</Label>
                <Input
                  id="route-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.ticketPrice}
                  onChange={(event) => setDraft({ ...draft, ticketPrice: event.target.value })}
                />
              </div>
            </fieldset>
            {validation && <p role="alert">{validation}</p>}
            {mutation.error && (
              <p role="alert" className="tg-notice">
                {mutation.error}
              </p>
            )}
            {mutation.uncertain && (
              <p>Cierra y actualiza las rutas antes de enviar otra solicitud.</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.busy}
                onClick={() => {
                  setEditor(null);
                  routes.refresh();
                }}
              >
                Cerrar
              </Button>
              <Button type="submit" disabled={mutation.busy || mutation.uncertain}>
                {mutation.busy ? "Guardando…" : "Guardar ruta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(next) => {
          if (!mutation.sending.current && !next) {
            setDeleting(null);
            routes.refresh();
          }
        }}
      >
        <DialogContent className="transport-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar ruta</DialogTitle>
            <DialogDescription>
              Solo se puede eliminar una ruta sin viajes asociados. Se conservará el historial de
              los viajes existentes.
            </DialogDescription>
          </DialogHeader>
          {mutation.error && <p role="alert">{mutation.error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutation.busy}
              onClick={() => {
                setDeleting(null);
                routes.refresh();
              }}
            >
              Cerrar
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.busy || mutation.uncertain}
              onClick={() => {
                if (deleting)
                  void mutation
                    .run(
                      `/api/branch-admin/routes/${deleting.routeId}?branchId=${branchId}`,
                      undefined,
                      z.null(),
                      "DELETE",
                    )
                    .then((result) => {
                      if (result === null) {
                        setDeleting(null);
                        setNotice("Ruta eliminada.");
                        routes.refresh();
                      }
                    });
              }}
            >
              Confirmar eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
