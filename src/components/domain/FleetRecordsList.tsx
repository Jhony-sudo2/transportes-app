"use client";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { RotateCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportTable, type Column } from "./ReportTable";
import { readFleetResponse } from "@/lib/fleet-ui";
type Props<T extends { id: number } & Record<string, unknown>> = {
  branchId: number;
  resource: "buses" | "drivers";
  schema: z.ZodType<T[], z.ZodTypeDef, unknown>;
  columns: Column<T>[];
  caption: string;
  emptyMessage: string;
  searchLabel: string;
  searchText: (record: T) => string;
  recordStatus: (record: T) => string;
  statusLabels: Record<string, string>;
};
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
export function FleetRecordsList<T extends { id: number } & Record<string, unknown>>({
  branchId,
  resource,
  schema,
  columns,
  caption,
  emptyMessage,
  searchLabel,
  searchText,
  recordStatus,
  statusLabels,
}: Props<T>) {
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    setRecords([]);
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const body = await readFleetResponse(
          await fetch(`/api/branch-admin/${resource}?branchId=${branchId}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        );
        if (
          !body ||
          typeof body !== "object" ||
          !("items" in body) ||
          !("branchId" in body) ||
          body.branchId !== branchId
        )
          throw new Error("No se pudo confirmar el listado de la sucursal.");
        const parsed = schema.safeParse(body.items);
        if (!parsed.success) throw new Error("El listado recibido no tiene el formato esperado.");
        if (!controller.signal.aborted) setRecords(parsed.data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el listado.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [branchId, resource, schema, retry]);
  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (!status || recordStatus(record) === status) &&
          normalize(searchText(record)).includes(normalize(query)),
      ),
    [records, query, status, searchText, recordStatus],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const statuses = [...new Set(records.map(recordStatus))].sort();
  return (
    <section className="min-w-0 space-y-5" aria-label={caption}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid w-full gap-4 sm:grid-cols-[minmax(0,1fr)_200px] lg:max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor={"fleet-search-" + resource}>{searchLabel}</Label>
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-3 top-4 text-[var(--tg-muted)]"
              />
              <Input
                id={"fleet-search-" + resource}
                value={query}
                disabled={loading || !!error}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="pl-10"
                type="search"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={"fleet-status-" + resource}>Estado</Label>
            <select
              id={"fleet-status-" + resource}
              value={status}
              disabled={loading || !!error}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3 text-sm disabled:opacity-60"
            >
              <option value="">Todos los estados</option>
              {[...new Set([...statuses, ...(status ? [status] : [])])].map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value] ?? value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => setRetry((value) => value + 1)}
        >
          <RotateCw size={15} aria-hidden="true" />
          Actualizar listado
        </Button>
      </div>
      {loading ? (
        <p role="status" className="tg-notice">
          Cargando {resource === "buses" ? "buses" : "choferes"} de la sucursal…
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-xl border border-red-300 p-5 text-sm">
          <p>{error}</p>
          <Button type="button" variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Reintentar listado
          </Button>
        </div>
      ) : (
        <>
          <p role="status" className="text-sm text-[var(--tg-muted)]">
            {filtered.length} de {records.length} {resource === "buses" ? "buses" : "choferes"}
          </p>
          {!records.length ? (
            <p className="rounded-xl border border-dashed border-[var(--tg-line)] bg-[var(--tg-paper)] p-8 text-center text-sm text-[var(--tg-muted)]">
              {emptyMessage}
            </p>
          ) : !filtered.length ? (
            <p className="tg-notice">
              No hay coincidencias con la búsqueda o el estado seleccionado.
            </p>
          ) : (
            <ReportTable columns={columns} data={visible} caption={caption} />
          )}
          {filtered.length > 10 && (
            <nav
              aria-label="Paginación del listado"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={15} aria-hidden="true" />
                Anterior
              </Button>
              <span className="text-sm text-[var(--tg-muted)]">
                Página {currentPage} de {pageCount}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Siguiente
                <ChevronRight size={15} aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
