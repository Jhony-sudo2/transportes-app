"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { RotateCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportTable, type Column } from "./ReportTable";
import { readFleetResponse } from "@/lib/fleet-ui";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import type { FleetAvailability } from "@/lib/fleet-availability";
export type FleetRecordsActions<T> = {
  update: (record: T) => void;
  remove: (id: number) => void;
  refresh: () => void;
  notify: (message: string) => void;
};
type Props<T extends { id: number } & Record<string, unknown>> = {
  branchId: number;
  resource: "buses" | "drivers";
  schema: z.ZodType<T[], z.ZodTypeDef, unknown>;
  columns: Column<T>[] | ((actions: FleetRecordsActions<T>) => Column<T>[]);
  caption: string;
  emptyMessage: string;
  searchLabel: string;
  searchText: (record: T) => string;
  recordStatus: (record: T) => string;
  statusLabels: Record<string, string>;
  availability?: (record: T) => FleetAvailability;
  recordNoun?: string;
  recordLabel: (record: T) => string;
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
  availability,
  recordNoun,
  recordLabel,
}: Props<T>) {
  const { busy, setBusy } = useBranchWorkspace();
  const updating = useRef(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
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
  async function changeAvailability(record: T) {
    const current = availability?.(record);
    if (!availability || !current || updating.current || busy || current.active === null) return;
    const active = !current.active;
    updating.current = true;
    setBusy(true);
    setSavingId(record.id);
    setActionError("");
    setNotice("");
    try {
      const body = await readFleetResponse(
        await fetch(`/api/branch-admin/${resource}/${record.id}/availability`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId, active }),
        }),
      );
      if (
        !body ||
        typeof body !== "object" ||
        !("item" in body) ||
        !("branchId" in body) ||
        body.branchId !== branchId
      )
        throw new Error("No se pudo confirmar el cambio.");
      const parsed = schema.safeParse([body.item]);
      const item = parsed.success ? parsed.data[0] : undefined;
      if (!item || item.id !== record.id || availability(item).active !== active)
        throw new Error("La respuesta no confirma el estado solicitado.");
      setRecords((previous) => previous.map((entry) => (entry.id === item.id ? item : entry)));
      setNotice(`${recordLabel(item)}: ${active ? "activado" : "desactivado"}.`);
    } catch (cause) {
      setActionError(
        (cause instanceof Error ? cause.message : "No se pudo confirmar el cambio.") +
          " Se volverá a consultar el listado para verificar su estado.",
      );
      setRetry((value) => value + 1);
    } finally {
      updating.current = false;
      setSavingId(null);
      setBusy(false);
    }
  }

  const actionColumn: Column<T> = {
    key: "id",
    header: "Disponibilidad",
    render: (_value, record) => {
      const current = availability?.(record);
      if (!current) return null;
      return current.active === null ? (
        <p className="max-w-48 text-xs text-[var(--tg-muted)]">{current.reason}</p>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || loading}
          aria-label={`${current.active ? "Desactivar" : "Activar"} ${recordLabel(record)}`}
          onClick={() => void changeAvailability(record)}
        >
          {savingId === record.id ? "Guardando…" : current.active ? "Desactivar" : "Activar"}
        </Button>
      );
    },
  };
  const tableColumns =
    typeof columns === "function"
      ? columns({
          update: (record) =>
            setRecords((current) => current.map((item) => (item.id === record.id ? record : item))),
          remove: (id) => setRecords((current) => current.filter((item) => item.id !== id)),
          refresh: () => setRetry((current) => current + 1),
          notify: (text) => {
            setNotice(text);
            setActionError("");
          },
        })
      : columns;
  const noun = recordNoun ?? (resource === "buses" ? "buses" : "choferes");
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
                disabled={loading || busy || !!error}
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
              disabled={loading || busy || !!error}
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
          disabled={loading || busy}
          onClick={() => setRetry((value) => value + 1)}
        >
          <RotateCw size={15} aria-hidden="true" />
          Actualizar listado
        </Button>
      </div>
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-xl border border-red-300 p-4 text-sm">
          {actionError}
        </p>
      )}
      {loading ? (
        <p role="status" className="tg-notice">
          Cargando {noun} de la sucursal…
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
            {filtered.length} de {records.length} {noun}
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
            <ReportTable
              columns={availability ? [...tableColumns, actionColumn] : tableColumns}
              data={visible}
              caption={caption}
              getRowKey={(record) => record.id}
            />
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
                disabled={busy || currentPage === 1}
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
                disabled={busy || currentPage === pageCount}
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
