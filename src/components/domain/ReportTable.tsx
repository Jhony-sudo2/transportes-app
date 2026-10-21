import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface ReportTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  caption?: string;
}

export function ReportTable<T extends Record<string, unknown>>({
  columns,
  data,
  caption,
}: ReportTableProps<T>): React.ReactElement {
  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]"
      data-testid="report-table"
    >
      <table className="w-full border-collapse font-secondary text-sm">
        {caption !== undefined && (
          <caption className="caption-top px-4 py-3 text-left font-sans text-base font-medium text-[var(--color-text-primary-black)]">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-[var(--color-text-secondary)]"
              >
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "border-b border-[var(--color-border)] transition-colors duration-150",
                  "hover:bg-[var(--color-surface-hover)]",
                  rowIndex % 2 === 0 ? "bg-[var(--color-white)]" : "bg-[var(--color-surface)]",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-4 py-3 text-[var(--color-text-primary)]"
                  >
                    {col.render !== undefined
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
