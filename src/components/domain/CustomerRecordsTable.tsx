"use client";
import { useState } from "react";
import { ReportTable, type Column } from "./ReportTable";
import { Button } from "@/components/ui/button";
export function CustomerRecordsTable<T extends { id: number } & Record<string, unknown>>({
  items,
  columns,
  caption,
  emptyMessage,
}: {
  items: T[];
  columns: Column<T>[];
  caption: string;
  emptyMessage: string;
}) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / 10));
  const current = Math.min(page, pages);
  if (!items.length)
    return (
      <p className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7 text-sm text-[var(--tg-muted)]">
        {emptyMessage}
      </p>
    );
  return (
    <div className="min-w-0 space-y-4">
      <ReportTable
        columns={columns}
        data={items.slice((current - 1) * 10, current * 10)}
        caption={caption}
        getRowKey={(item) => item.id}
      />
      {pages > 1 && (
        <nav
          aria-label={"Paginación de " + caption}
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p>
            Página {current} de {pages} · {items.length} registros
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Siguiente
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
