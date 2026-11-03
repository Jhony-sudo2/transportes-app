"use client";
import { useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import {
  CategorySchema,
  CategoryInputSchema,
  WorkshopInputSchema,
  WorkshopServiceSchema,
} from "@/lib/validators/maintenance";
import { BusListSchema } from "@/lib/validators/fleet-resources";
import type { WorkshopLine } from "@/types/maintenance";
import { guatemalaDate } from "@/lib/transport-time";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const categoryList = CategorySchema.array(),
  serviceList = WorkshopServiceSchema.array();
export function ExpenseCategories({ userId, branchId }: { userId: number; branchId?: number }) {
  const query = branchId ? `?branchId=${branchId}` : "",
    categories = useCustomerData(`/api/maintenance/categories${query}`, categoryList),
    [notice, setNotice] = useState("");
  const updated = () => {
    setNotice("Categoría actualizada. Se conserva el historial de gastos.");
    categories.refresh();
  };
  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-semibold">Categorías de taller</h2>
      <CustomerDataState
        loading={categories.loading}
        error={categories.error}
        retry={categories.refresh}
      />
      {notice && <p role="status">{notice}</p>}
      <details>
        <summary className="cursor-pointer underline">Crear categoría</summary>
        <div className="mt-4">
          <OperationForm
            scope={`category-new:${userId}:${branchId ?? "global"}`}
            path={`/api/maintenance/categories${query}`}
            schema={CategoryInputSchema}
            resultSchema={CategorySchema}
            fields={[
              { name: "name", label: "Nombre de la categoría" },
              { name: "active", label: "Categoría habilitada", type: "checkbox", value: true },
            ]}
            label="Crear categoría"
            onSaved={updated}
          />
        </div>
      </details>
      {categories.data?.map((c) => (
        <details key={c.categoryId} className="rounded-xl border border-[var(--tg-line)] p-4">
          <summary className="cursor-pointer">
            {c.name} · {c.active ? "Habilitada" : "Deshabilitada"}
          </summary>
          <div className="mt-4">
            <OperationForm
              scope={`category-edit:${userId}:${c.categoryId}`}
              path={`/api/maintenance/categories/${c.categoryId}${query}`}
              method="PATCH"
              schema={CategoryInputSchema}
              resultSchema={CategorySchema}
              fields={[
                { name: "name", label: "Nombre de la categoría", value: c.name },
                {
                  name: "active",
                  label: "Categoría habilitada",
                  type: "checkbox",
                  value: c.active,
                },
              ]}
              label="Guardar categoría"
              onSaved={updated}
            />
          </div>
        </details>
      ))}
      <p className="text-sm text-[var(--tg-muted)]">
        Deshabilitar impide nuevos registros y conserva los detalles anteriores.
      </p>
    </section>
  );
}
export function MaintenanceWorkspace({ userId, branchId }: { userId: number; branchId: number }) {
  const query = `?branchId=${branchId}`,
    categories = useCustomerData(`/api/maintenance/categories${query}`, categoryList),
    buses = useCustomerData(`/api/maintenance/buses${query}`, BusListSchema),
    [filters, setFilters] = useState(""),
    [lines, setLines] = useState<WorkshopLine[]>([
      { categoryId: 0, lineType: "LABOR", description: "", amount: NaN },
    ]),
    [notice, setNotice] = useState(""),
    [creating, setCreating] = useState(false),
    { busy } = useBranchWorkspace();
  const services = useCustomerData(
    `/api/maintenance/services${query}${filters ? `&${filters}` : ""}`,
    serviceList,
  );
  function line(index: number, value: Partial<WorkshopLine>) {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...value } : l)));
  }
  const selectClass =
    "h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3";
  return (
    <div className="space-y-6">
      <CustomerDataState
        loading={categories.loading || buses.loading || services.loading}
        error={categories.error || buses.error || services.error}
        retry={() => {
          categories.refresh();
          buses.refresh();
          services.refresh();
        }}
      />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      <Button
        disabled={busy || !buses.data || !categories.data}
        onClick={() => setCreating(!creating)}
      >
        {creating ? "Cerrar registro" : "Registrar servicio de taller"}
      </Button>
      {creating && (
        <section className="space-y-5 rounded-2xl border border-[var(--tg-line)] p-5">
          <h2 className="text-xl font-semibold">Nuevo servicio de taller</h2>
          <fieldset disabled={busy} className="space-y-4">
            {lines.map((l, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl border border-[var(--tg-line)] p-4 sm:grid-cols-2"
              >
                <label>
                  Categoría del detalle {index + 1}
                  <select
                    className={selectClass}
                    value={l.categoryId}
                    aria-label={`Categoría del detalle ${index + 1}`}
                    onChange={(e) => line(index, { categoryId: Number(e.target.value) })}
                  >
                    <option value={0}>Selecciona categoría</option>
                    {categories.data
                      ?.filter((c) => c.active)
                      .map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Tipo de detalle
                  <select
                    className={selectClass}
                    value={l.lineType}
                    onChange={(e) =>
                      line(index, { lineType: e.target.value as WorkshopLine["lineType"] })
                    }
                  >
                    <option value="LABOR">Mano de obra</option>
                    <option value="PART">Repuesto</option>
                  </select>
                </label>
                <div className="space-y-2">
                  <Label htmlFor={`work-description-${index}`}>
                    Descripción del detalle {index + 1}
                  </Label>
                  <Input
                    id={`work-description-${index}`}
                    value={l.description}
                    onChange={(e) => line(index, { description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`work-amount-${index}`}>Monto del detalle {index + 1} (Q)</Label>
                  <Input
                    id={`work-amount-${index}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={Number.isNaN(l.amount) ? "" : l.amount}
                    onChange={(e) =>
                      line(index, { amount: e.target.value === "" ? NaN : Number(e.target.value) })
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  type="button"
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  Quitar detalle {index + 1}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLines([
                  ...lines,
                  { categoryId: 0, lineType: "PART", description: "", amount: NaN },
                ])
              }
            >
              Agregar detalle de taller
            </Button>
          </fieldset>
          <OperationForm
            scope={`workshop-new:${userId}:${branchId}`}
            path={`/api/maintenance/services${query}`}
            schema={WorkshopInputSchema}
            resultSchema={WorkshopServiceSchema}
            base={{ lines }}
            fields={[
              {
                name: "busId",
                label: "Bus de la sucursal",
                type: "select",
                numeric: true,
                choices: buses.data?.map((b) => ({ value: String(b.id), label: b.plateNumber })),
              },
              {
                name: "serviceDate",
                label: "Fecha del servicio",
                type: "date",
                value: guatemalaDate(),
              },
            ]}
            label="Confirmar servicio y gastos"
            onSaved={(r) => {
              setNotice(
                `Servicio #${r.workshopServiceId} registrado. Total confirmado: Q${r.totalAmount.toFixed(2)}.`,
              );
              setCreating(false);
              setLines([{ categoryId: 0, lineType: "LABOR", description: "", amount: NaN }]);
              services.refresh();
            }}
          />
        </section>
      )}
      <form
        className="grid gap-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget),
            params = new URLSearchParams();
          for (const key of ["busId", "dateFrom", "dateTo"]) {
            const value = String(data.get(key) ?? "");
            if (value) params.set(key, value);
          }
          setFilters(params.toString());
        }}
      >
        <label>
          Bus
          <select className={selectClass} name="busId">
            <option value="">Todos los buses</option>
            {buses.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.plateNumber}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <Input type="date" name="dateFrom" />
        </label>
        <label>
          Hasta
          <Input type="date" name="dateTo" />
        </label>
        <Button className="self-end">Consultar historial de taller</Button>
      </form>
      <p className="text-sm">Sin fechas se consulta todo el historial de la sucursal.</p>
      {services.data?.length === 0 && <p>No hay servicios de taller para este filtro.</p>}
      {services.data?.map((service) => (
        <article
          key={service.workshopServiceId}
          className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5"
        >
          <h2 className="text-xl font-semibold">
            Servicio #{service.workshopServiceId} ·{" "}
            {buses.data?.find((b) => b.id === service.busId)?.plateNumber ??
              `Bus #${service.busId}`}
          </h2>
          <p>
            {service.serviceDate} · Total Q{service.totalAmount.toFixed(2)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Detalle</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {service.lines.map((l, i) => (
                  <tr key={i} className="border-t border-[var(--tg-line)]">
                    <td className="py-3 pr-4">{l.description}</td>
                    <td>
                      {categories.data?.find((c) => c.categoryId === l.categoryId)?.name ??
                        `#${l.categoryId}`}
                    </td>
                    <td>{l.lineType === "LABOR" ? "Mano de obra" : "Repuesto"}</td>
                    <td>Q{l.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
      <ExpenseCategories userId={userId} branchId={branchId} />
    </div>
  );
}
