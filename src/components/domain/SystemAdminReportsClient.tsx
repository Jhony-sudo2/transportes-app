"use client";

import { useState, useCallback } from "react";
import { Building2, FileDown, Search, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ReportTable } from "@/components/domain/ReportTable";
import {
  CongressesByInstitutionReportSchema,
  type CongressesByInstitutionReportData,
  type CongressesByInstitutionRowData,
} from "@/lib/validators/reports";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

// ── Columns ───────────────────────────────────────────────────────────────────

const CONGRESSES_COLUMNS = [
  {
    key: "institutionName" as keyof CongressesByInstitutionRowData,
    header: "Institucion",
  },
  {
    key: "congressName" as keyof CongressesByInstitutionRowData,
    header: "Congreso",
  },
  {
    key: "startDate" as keyof CongressesByInstitutionRowData,
    header: "Inicio",
    render: (v: CongressesByInstitutionRowData[keyof CongressesByInstitutionRowData]) =>
      formatDate(v as string),
  },
  {
    key: "endDate" as keyof CongressesByInstitutionRowData,
    header: "Fin",
    render: (v: CongressesByInstitutionRowData[keyof CongressesByInstitutionRowData]) =>
      formatDate(v as string),
  },
  {
    key: "location" as keyof CongressesByInstitutionRowData,
    header: "Lugar",
  },
  {
    key: "price" as keyof CongressesByInstitutionRowData,
    header: "Precio",
    render: (v: CongressesByInstitutionRowData[keyof CongressesByInstitutionRowData]) => (
      <span className="font-secondary font-medium text-[var(--color-text-primary-black)]">
        {formatCurrency(v as number)}
      </span>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function SystemAdminReportsClient(): React.ReactElement {
  const toast = useToast();

  // Congresses by institution filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState<CongressesByInstitutionReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReportData(null);
    try {
      const qs = new URLSearchParams();
      if (dateFrom !== "") qs.set("dateFrom", dateFrom);
      if (dateTo !== "") qs.set("dateTo", dateTo);
      const res = await fetch(`/api/reports/congresses-by-institution?${qs.toString()}`);
      if (!res.ok) {
        const raw: unknown = await res.json().catch(() => ({}));
        const err = ProblemDetailSchema.safeParse(raw);
        toast.error(err.success ? err.data.detail : "Error al cargar el reporte.");
        return;
      }
      const raw: unknown = await res.json();
      const parsed = CongressesByInstitutionReportSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error("Respuesta inesperada del servidor.");
        return;
      }
      setReportData(parsed.data);
    } catch {
      toast.error("Error de conexion. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, toast]);

  function buildExportUrl(): string {
    const qs = new URLSearchParams();
    if (dateFrom !== "") qs.set("dateFrom", dateFrom);
    if (dateTo !== "") qs.set("dateTo", dateTo);
    const suffix = qs.toString() !== "" ? `?${qs.toString()}` : "";
    return `/api/reports/congresses-by-institution/export${suffix}`;
  }

  function openExport(): void {
    window.open(buildExportUrl(), "_blank", "noopener,noreferrer");
  }

  // Group by institution for summary stats
  const institutionCount =
    reportData !== null
      ? new Set(reportData.items.map((r) => r.institutionId)).size
      : 0;

  return (
    <div className="flex flex-col gap-6" data-testid="system-admin-reports-page">
      <PageHeader
        title="Reportes"
        description="Consulta y exporta reportes del sistema."
      />

      {/* Congresses by institution */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)]">
        {/* Card header */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-pale-blue)] text-[var(--color-primary-text)]">
            <Building2 size={18} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
              Congresos por Institucion
            </h2>
            <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
              Lista de congresos agrupados por institucion dentro de un rango de fechas.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="date-from"
                className="font-secondary text-xs font-medium text-[var(--color-text-primary)]"
              >
                Fecha inicio (opcional)
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-44"
                data-testid="date-from-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="date-to"
                className="font-secondary text-xs font-medium text-[var(--color-text-primary)]"
              >
                Fecha fin (opcional)
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-44"
                data-testid="date-to-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => void fetchReport()}
                disabled={loading}
                className="inline-flex min-h-[44px] items-center gap-2"
                data-testid="btn-fetch-report"
              >
                {loading ? <LoadingSpinner size="sm" /> : <Search size={15} strokeWidth={1.5} />}
                Buscar
              </Button>

              {reportData !== null && reportData.items.length > 0 && (
                <Button
                  variant="outline"
                  onClick={openExport}
                  className="inline-flex min-h-[44px] items-center gap-2"
                  data-testid="btn-export-report"
                >
                  <FileDown size={15} strokeWidth={1.5} />
                  Exportar PDF
                </Button>
              )}
            </div>
          </div>

          {reportData !== null && (
            <p className="mt-3 font-secondary text-xs text-[var(--color-text-secondary)]">
              {reportData.totalItems} congreso{reportData.totalItems !== 1 ? "s" : ""} en{" "}
              {institutionCount} institucion{institutionCount !== 1 ? "es" : ""}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="p-5">
          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          )}

          {!loading && reportData !== null && (
            <div data-testid="congresses-report-result">
              <ReportTable
                columns={CONGRESSES_COLUMNS}
                data={reportData.items}
                caption="Congresos por institucion"
              />
            </div>
          )}

          {!loading && reportData === null && (
            <EmptyState
              icon={<Building2 size={24} strokeWidth={1.5} />}
              title="Sin datos"
              description="Opcionalmente filtra por rango de fechas y haz clic en Buscar. Sin filtros se muestran todos los congresos."
            />
          )}
        </div>
      </div>

      {/* G4 pending notice */}
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <BarChart3
          size={18}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 text-[var(--color-text-secondary)]"
        />
        <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
          El reporte de <strong>Ganancias de la Plataforma</strong> estara disponible proximamente
          (requiere integracion con el servicio de pagos).
        </p>
      </div>
    </div>
  );
}
