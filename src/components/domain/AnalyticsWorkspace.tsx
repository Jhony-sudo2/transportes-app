"use client";
import { useMemo, useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import {
  AnalyticsReportSchema,
  ReportBusOptionListSchema,
  ReportRouteOptionListSchema,
} from "@/lib/validators/analytics";
import { BranchListSchema } from "@/lib/validators/branch";
import {
  reportNames,
  reportKeys,
  reportColumns,
  cellDisplay,
  decimalDisplay,
  reportPdf,
  reportStatusLabels,
} from "@/lib/analytics-ui";
import type { ReportKind, ReportMapRoute } from "@/types/analytics";
import type { Branch } from "@/types/branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerDataState } from "./CustomerDataState";
import { BranchMap } from "./BranchMap";
const selectClass =
  "h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3";
const OUTGOING_COLOR = "#176a52";
const INCOMING_COLOR = "#b45309";
/** Select de bus con nombre (placa · marca modelo), agrupado por tipo de bus. */
function BusFilter({ branchId, branchFilter }: { branchId?: number; branchFilter: string }) {
  const options = useCustomerData(
    `/api/analytics/buses${branchId !== undefined ? `?branchId=${branchId}` : ""}`,
    ReportBusOptionListSchema,
  );
  const visible = (options.data ?? []).filter(
    (bus) => !branchFilter || String(bus.branchId) === branchFilter,
  );
  const groups = [...new Set(visible.map((bus) => bus.busTypeName))];
  return (
    <label>
      Bus (opcional)
      <select name="busId" className={selectClass} disabled={options.loading}>
        <option value="">{options.loading ? "Cargando buses…" : "Todos los buses"}</option>
        {groups.map((group) => (
          <optgroup key={group} label={`Tipo: ${group}`}>
            {visible
              .filter((bus) => bus.busTypeName === group)
              .map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {branchId === undefined ? `${bus.label} · ${bus.branchName}` : bus.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {options.error && (
        <span className="mt-1 block text-sm text-[var(--tg-muted)]">{options.error}</span>
      )}
      {!options.loading && !options.error && visible.length === 0 && (
        <span className="mt-1 block text-sm text-[var(--tg-muted)]">
          No hay buses registrados para esta selección.
        </span>
      )}
    </label>
  );
}
/** Select de ruta con nombre "Origen → Destino". */
function RouteFilter({ branchId }: { branchId?: number }) {
  const options = useCustomerData(
    `/api/analytics/routes${branchId !== undefined ? `?branchId=${branchId}` : ""}`,
    ReportRouteOptionListSchema,
  );
  return (
    <label>
      Ruta (opcional)
      <select name="routeId" className={selectClass} disabled={options.loading}>
        <option value="">{options.loading ? "Cargando rutas…" : "Todas las rutas"}</option>
        {options.data?.map((route) => (
          <option key={route.id} value={route.id}>
            {route.label}
          </option>
        ))}
      </select>
      {options.error && (
        <span className="mt-1 block text-sm text-[var(--tg-muted)]">{options.error}</span>
      )}
    </label>
  );
}
export function AnalyticsWorkspace({ branchId }: { branchId?: number }) {
  const local = branchId !== undefined,
    choices = (Object.keys(reportNames) as ReportKind[]).filter((k) =>
      local
        ? ["fleet-operations", "branch-operations"].includes(k)
        : !["fleet-operations", "branch-operations"].includes(k),
    );
  const [kind, setKind] = useState<ReportKind>(local ? "fleet-operations" : "income"),
    [query, setQuery] = useState(local ? `branchId=${branchId}` : ""),
    [error, setError] = useState(""),
    [branchFilter, setBranchFilter] = useState("");
  const context = useCustomerData(
      `/api/analytics/context${local ? `?branchId=${branchId}` : ""}`,
      BranchListSchema,
    ),
    resource = useCustomerData(`/api/analytics/${kind}?${query}`, AnalyticsReportSchema);
  const names = resource.data?.names;
  const origin = resource.data?.filters["originBranchId"];
  const originName = (origin && names?.branches[origin]) || "la sucursal";
  const segments = useMemo(() => {
    const line = (r: ReportMapRoute, incoming: boolean) => ({
      origin: { latitude: r.origin.lat, longitude: r.origin.lng },
      destination: { latitude: r.destination.lat, longitude: r.destination.lng },
      label: `${names?.routes[String(r.routeId)] ?? `Ruta #${r.routeId}`} · ${
        incoming ? `llega a ${originName} (destino)` : `sale de ${originName} (origen)`
      }`,
      color: incoming ? INCOMING_COLOR : OUTGOING_COLOR,
      dashArray: incoming ? "8 6" : undefined,
    });
    return [
      ...(resource.data?.mapRoutes?.map((r) => line(r, false)) ?? []),
      ...(resource.data?.incomingRoutes?.map((r) => line(r, true)) ?? []),
    ];
  }, [resource.data, names, originName]);
  const mapBranches = useMemo(() => {
    const routes = [...(resource.data?.mapRoutes ?? []), ...(resource.data?.incomingRoutes ?? [])];
    const used = new Set(
      routes.flatMap((r) => [
        `${r.origin.lat},${r.origin.lng}`,
        `${r.destination.lat},${r.destination.lng}`,
      ]),
    );
    // Marcadores con el nombre real de la sucursal (mismas coordenadas que entrega Fleet).
    const named = (context.data ?? []).filter(
      (b) => b.latitude != null && b.longitude != null && used.has(`${b.latitude},${b.longitude}`),
    );
    const covered = new Set(named.map((b) => `${b.latitude},${b.longitude}`));
    const unnamed = [...used]
      .filter((point) => !covered.has(point))
      .map((point, index) => {
        const [lat, lng] = point.split(",").map(Number);
        return {
          id: -(index + 1),
          name: "Sucursal",
          latitude: lat ?? 0,
          longitude: lng ?? 0,
        } satisfies Branch;
      });
    return [...named, ...unnamed];
  }, [resource.data, context.data]);
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
              setBranchFilter("");
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
            <select
              name="branchId"
              className={selectClass}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
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
            Sucursal
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
            <RouteFilter {...(local ? { branchId } : {})} />
          </>
        )}
        {(kind === "workshop-categories" || kind === "branch-operations") && (
          <BusFilter {...(local ? { branchId } : {})} branchFilter={branchFilter} />
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
                  {reportStatusLabels[s] ?? s}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button className="self-end" disabled={resource.loading}>
          Consultar reporte
        </Button>
      </form>
      <p className="text-sm">Si no seleccionas fechas, se muestra todo el historial disponible.</p>
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
              <ul className="flex flex-wrap gap-4 text-sm" aria-label="Leyenda del mapa">
                <li className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-1 w-8 rounded"
                    style={{ background: OUTGOING_COLOR }}
                  />
                  Sale de {originName} (origen)
                </li>
                <li className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-0 w-8 border-t-4 border-dashed"
                    style={{ borderColor: INCOMING_COLOR }}
                  />
                  Llega a {originName} (destino)
                </li>
              </ul>
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
                                {cellDisplay(row[key], key, names)}
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
