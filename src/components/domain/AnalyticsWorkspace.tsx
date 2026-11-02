"use client";
import { useMemo, useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { AnalyticsReportSchema } from "@/lib/validators/analytics";
import { BranchListSchema } from "@/lib/validators/branch";
import {
  reportNames,
  reportKeys,
  reportColumns,
  cellDisplay,
  decimalDisplay,
  reportPdf,
} from "@/lib/analytics-ui";
import type { ReportKind } from "@/types/analytics";
import type { Branch } from "@/types/branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerDataState } from "./CustomerDataState";
import { BranchMap } from "./BranchMap";
export function AnalyticsWorkspace({ branchId }: { branchId?: number }) {
  const local = branchId !== undefined,
    choices = (Object.keys(reportNames) as ReportKind[]).filter((k) =>
      local
        ? ["fleet-operations", "branch-operations"].includes(k)
        : !["fleet-operations", "branch-operations"].includes(k),
    );
  const [kind, setKind] = useState<ReportKind>(local ? "fleet-operations" : "income"),
    [query, setQuery] = useState(local ? `branchId=${branchId}` : ""),
    [error, setError] = useState("");
  const context = useCustomerData(
      `/api/analytics/context${local ? `?branchId=${branchId}` : ""}`,
      BranchListSchema,
    ),
    resource = useCustomerData(`/api/analytics/${kind}?${query}`, AnalyticsReportSchema);
  const segments = useMemo(
    () =>
      resource.data?.mapRoutes?.map((r) => ({
        origin: { latitude: r.origin.lat, longitude: r.origin.lng },
        destination: { latitude: r.destination.lat, longitude: r.destination.lng },
        label: `Ruta #${r.routeId}`,
      })) ?? [],
    [resource.data],
  );
  const mapBranches = useMemo(
    () =>
      resource.data?.mapRoutes?.flatMap(
        (r) =>
          [
            {
              id: r.routeId * 2,
              name: `Origen · ruta #${r.routeId}`,
              latitude: r.origin.lat,
              longitude: r.origin.lng,
            },
            {
              id: r.routeId * 2 + 1,
              name: `Destino · ruta #${r.routeId}`,
              latitude: r.destination.lat,
              longitude: r.destination.lng,
            },
          ] satisfies Branch[],
      ) ?? [],
    [resource.data],
  );
  const selectClass =
    "h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3";
  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-2xl border border-[var(--tg-line)] p-5 sm:grid-cols-2 lg:grid-cols-3"
        key={kind}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget),
            params = new URLSearchParams();
          if (local) params.set("branchId", String(branchId));
          for (const [k, v] of data) if (String(v)) params.set(k, String(v));
          const next = params.toString();
          if (next === query) resource.refresh();
          else setQuery(next);
        }}
      >
        <label>
          Reporte
          <select
            className={selectClass}
            value={kind}
            aria-label="Reporte"
            onChange={(e) => {
              const next = e.target.value as ReportKind;
              setKind(next);
              setQuery(
                local
                  ? `branchId=${branchId}${next === "branch-operations" ? "&kind=TICKET_SALES" : ""}`
                  : next === "route-map" && context.data?.[0]
                    ? `originBranchId=${context.data[0].id}`
                    : "",
              );
            }}
          >
            {choices.map((k) => (
              <option key={k} value={k}>
                {reportNames[k]}
              </option>
            ))}
          </select>
        </label>
        {kind !== "route-map" && kind !== "fleet-operations" && (
          <>
            <label>
              Desde
              <Input type="date" name="dateFrom" />
            </label>
            <label>
              Hasta
              <Input type="date" name="dateTo" />
            </label>
          </>
        )}
        {(kind === "profit" || kind === "workshop-categories") && (
          <label>
            Sucursal
            <select name="branchId" className={selectClass}>
              <option value="">Todas las sucursales</option>
              {context.data?.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === "route-map" && (
          <label>
            Sucursal de origen
            <select name="originBranchId" className={selectClass}>
              {context.data?.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === "branch-operations" && (
          <>
            <label>
              Operación
              <select name="kind" className={selectClass}>
                <option value="TICKET_SALES">Ventas de boletos</option>
                <option value="RENTALS">Alquileres</option>
                <option value="DEPRECIATION">Depreciación</option>
                <option value="WORKSHOP">Taller</option>
              </select>
            </label>
            <label>
              Ruta (opcional)
              <Input type="number" name="routeId" min={1} step="1" />
            </label>
          </>
        )}
        {(kind === "workshop-categories" || kind === "branch-operations") && (
          <label>
            Bus (opcional)
            <Input type="number" name="busId" min={1} step="1" />
          </label>
        )}
        {kind === "fleet-operations" && (
          <label>
            Estado
            <select name="status" className={selectClass}>
              <option value="">Todos</option>
              {[
                "AVAILABLE",
                "OUT_OF_SERVICE",
                "IN_SERVICE",
                "ACTIVE",
                "INACTIVE",
                "PENDING",
                "ACCOUNT_REJECTED",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button className="self-end" disabled={resource.loading}>
          Consultar reporte
        </Button>
      </form>
      <p className="text-sm">
        Fechas vacías: todo el historial autorizado. Los totales y subtotales se muestran tal como
        fueron confirmados por Analytics.
      </p>
      <CustomerDataState
        loading={resource.loading || context.loading}
        error={resource.error || context.error}
        retry={() => {
          resource.refresh();
          context.refresh();
        }}
      />
      {error && <p role="alert">{error}</p>}
      {resource.data && (
        <>
          <Button
            variant="outline"
            onClick={() =>
              resource.data &&
              void reportPdf(resource.data).catch(() =>
                setError("No se pudo generar el PDF. Inténtalo nuevamente."),
              )
            }
          >
            Exportar PDF
          </Button>
          {resource.data.mapRoutes && (
            <div className="space-y-3">
              <p className="text-sm">
                Referencia geográfica entre sucursales; no es un trazado vial calculado.
              </p>
              <BranchMap branches={mapBranches} segments={segments} point={null} focus={null} />
            </div>
          )}
          {resource.data.sections.map((section, index) => {
            const columns = reportKeys(section.rows);
            return (
              <section
                key={index}
                className="space-y-3 rounded-2xl border border-[var(--tg-line)] p-5"
              >
                <h2 className="text-xl font-semibold">{section.title}</h2>
                {section.rows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          {columns.map((key) => (
                            <th key={key} className="whitespace-nowrap p-3">
                              {reportColumns[key] ?? key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, i) => (
                          <tr key={i} className="border-t border-[var(--tg-line)]">
                            {columns.map((key) => (
                              <td key={key} className="min-w-28 break-words p-3">
                                {cellDisplay(row[key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>Sin registros.</p>
                )}
                {section.subtotal !== undefined && (
                  <p className="font-semibold">Subtotal: Q{decimalDisplay(section.subtotal)}</p>
                )}
              </section>
            );
          })}
          {resource.data.grandTotal !== undefined && (
            <p className="text-xl font-semibold">
              Total general: Q{decimalDisplay(resource.data.grandTotal)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
