"use client";

import { useState, useCallback } from "react";
import {
  Users,
  ClipboardCheck,
  BookOpen,
  FileDown,
  Search,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ReportTable } from "@/components/domain/ReportTable";
import { CongressCombobox } from "@/components/domain/CongressCombobox";
import {
  ParticipantReportSchema,
  AttendanceByActivityReportSchema,
  WorkshopReservationReportSchema,
  type ParticipantReportData,
  type AttendanceByActivityReportData,
  type WorkshopReservationReportData,
  type ParticipantReportRowData,
  type AttendanceByActivityRowData,
  type WorkshopReservationRowData,
} from "@/lib/validators/reports";
import { ProblemDetailSchema } from "@/lib/validators/error";
import type { CongressData } from "@/lib/validators/congress";
import { formatDateTime } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "participants" | "attendance" | "workshops";

interface TabMeta {
  id: TabId;
  label: string;
  icon: React.ReactElement;
}

const TABS: TabMeta[] = [
  { id: "participants", label: "Participantes", icon: <Users size={15} strokeWidth={1.5} /> },
  { id: "attendance", label: "Asistencia", icon: <ClipboardCheck size={15} strokeWidth={1.5} /> },
  { id: "workshops", label: "Reservas Talleres", icon: <BookOpen size={15} strokeWidth={1.5} /> },
];

const PARTICIPATION_TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "ENROLLED", label: "Inscritos" },
  { value: "PROPOSAL_AUTHOR", label: "Autores de propuesta" },
  { value: "SPEAKER", label: "Ponentes" },
  { value: "WORKSHOP_LEADER", label: "Lideres de taller" },
  { value: "GUEST_SPEAKER", label: "Ponentes invitados" },
];

// ── Participant columns ───────────────────────────────────────────────────────

const PARTICIPANT_COLUMNS = [
  { key: "personalId" as keyof ParticipantReportRowData, header: "ID Personal" },
  { key: "fullName" as keyof ParticipantReportRowData, header: "Nombre completo" },
  { key: "organization" as keyof ParticipantReportRowData, header: "Organizacion" },
  { key: "email" as keyof ParticipantReportRowData, header: "Correo" },
  { key: "phone" as keyof ParticipantReportRowData, header: "Telefono" },
  {
    key: "participationTypes" as keyof ParticipantReportRowData,
    header: "Tipo de participacion",
    render: (value: ParticipantReportRowData[keyof ParticipantReportRowData]) => {
      const types = value as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {types.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-2 py-0.5 font-secondary text-xs font-medium text-white"
            >
              {PARTICIPATION_TYPE_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      );
    },
  },
];

const PARTICIPATION_TYPE_LABELS: Record<string, string> = {
  ENROLLED: "Inscrito",
  PROPOSAL_AUTHOR: "Autor",
  SPEAKER: "Ponente",
  WORKSHOP_LEADER: "Lider taller",
  GUEST_SPEAKER: "Ponente invitado",
};

// ── Attendance columns ────────────────────────────────────────────────────────

const ATTENDANCE_COLUMNS = [
  { key: "activityName" as keyof AttendanceByActivityRowData, header: "Actividad" },
  { key: "roomName" as keyof AttendanceByActivityRowData, header: "Sala" },
  {
    key: "startTime" as keyof AttendanceByActivityRowData,
    header: "Inicio",
    render: (v: AttendanceByActivityRowData[keyof AttendanceByActivityRowData]) =>
      formatDateTime(v as string),
  },
  {
    key: "endTime" as keyof AttendanceByActivityRowData,
    header: "Fin",
    render: (v: AttendanceByActivityRowData[keyof AttendanceByActivityRowData]) =>
      formatDateTime(v as string),
  },
  {
    key: "attendanceCount" as keyof AttendanceByActivityRowData,
    header: "Asistentes",
    render: (v: AttendanceByActivityRowData[keyof AttendanceByActivityRowData]) => (
      <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[var(--color-primary)] px-2 font-secondary text-xs font-medium text-white">
        {v as number}
      </span>
    ),
  },
];

// ── Workshop columns ──────────────────────────────────────────────────────────

const WORKSHOP_COLUMNS = [
  { key: "activityName" as keyof WorkshopReservationRowData, header: "Taller" },
  { key: "workshopCapacity" as keyof WorkshopReservationRowData, header: "Capacidad" },
  { key: "reservationCount" as keyof WorkshopReservationRowData, header: "Reservas" },
  {
    key: "availableSeats" as keyof WorkshopReservationRowData,
    header: "Disponibles",
    render: (v: WorkshopReservationRowData[keyof WorkshopReservationRowData]) => {
      const seats = v as number;
      return (
        <span
          className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 font-secondary text-xs font-medium ${
            seats === 0
              ? "bg-[var(--color-error)] text-white"
              : "bg-[var(--color-primary)] text-white"
          }`}
        >
          {seats}
        </span>
      );
    },
  },
  {
    key: "roster" as keyof WorkshopReservationRowData,
    header: "Inscritos",
    render: (v: WorkshopReservationRowData[keyof WorkshopReservationRowData]) => {
      const roster = v as WorkshopReservationRowData["roster"];
      if (roster.length === 0) {
        return <span className="font-secondary text-xs text-[var(--color-text-secondary)]">Sin reservas</span>;
      }
      return (
        <ul className="flex flex-col gap-0.5">
          {roster.map((r) => (
            <li key={r.personalId} className="font-secondary text-xs text-[var(--color-text-primary)]">
              {r.fullName} <span className="text-[var(--color-text-secondary)]">({r.personalId})</span>
            </li>
          ))}
        </ul>
      );
    },
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface CongressAdminReportsClientProps {
  congresses: CongressData[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CongressAdminReportsClient({
  congresses,
}: CongressAdminReportsClientProps): React.ReactElement {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("participants");
  const [selectedCongressId, setSelectedCongressId] = useState<string | null>(null);

  // Participant filters
  const [participantType, setParticipantType] = useState("");
  const [participantData, setParticipantData] = useState<ParticipantReportData | null>(null);
  const [participantLoading, setParticipantLoading] = useState(false);

  // Attendance filters
  const [attendanceDateFrom, setAttendanceDateFrom] = useState("");
  const [attendanceDateTo, setAttendanceDateTo] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceByActivityReportData | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Workshop filters
  const [workshopData, setWorkshopData] = useState<WorkshopReservationReportData | null>(null);
  const [workshopLoading, setWorkshopLoading] = useState(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────────

  const fetchParticipants = useCallback(async () => {
    if (selectedCongressId === null) return;
    setParticipantLoading(true);
    setParticipantData(null);
    try {
      const qs = new URLSearchParams({ congressId: selectedCongressId });
      if (participantType !== "") qs.set("type", participantType);
      const res = await fetch(`/api/reports/participants?${qs.toString()}`);
      if (!res.ok) {
        const raw: unknown = await res.json().catch(() => ({}));
        const err = ProblemDetailSchema.safeParse(raw);
        toast.error(err.success ? err.data.detail : "Error al cargar el reporte de participantes.");
        return;
      }
      const raw: unknown = await res.json();
      const parsed = ParticipantReportSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error("Respuesta inesperada del servidor.");
        return;
      }
      setParticipantData(parsed.data);
    } catch {
      toast.error("Error de conexion. Intenta de nuevo.");
    } finally {
      setParticipantLoading(false);
    }
  }, [selectedCongressId, participantType, toast]);

  const fetchAttendance = useCallback(async () => {
    if (selectedCongressId === null) return;
    setAttendanceLoading(true);
    setAttendanceData(null);
    try {
      const qs = new URLSearchParams({ congressId: selectedCongressId });
      if (attendanceDateFrom !== "") qs.set("dateFrom", attendanceDateFrom);
      if (attendanceDateTo !== "") qs.set("dateTo", attendanceDateTo);
      const res = await fetch(`/api/reports/attendance-by-activity?${qs.toString()}`);
      if (!res.ok) {
        const raw: unknown = await res.json().catch(() => ({}));
        const err = ProblemDetailSchema.safeParse(raw);
        toast.error(err.success ? err.data.detail : "Error al cargar el reporte de asistencia.");
        return;
      }
      const raw: unknown = await res.json();
      const parsed = AttendanceByActivityReportSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error("Respuesta inesperada del servidor.");
        return;
      }
      setAttendanceData(parsed.data);
    } catch {
      toast.error("Error de conexion. Intenta de nuevo.");
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedCongressId, attendanceDateFrom, attendanceDateTo, toast]);

  const fetchWorkshops = useCallback(async () => {
    if (selectedCongressId === null) return;
    setWorkshopLoading(true);
    setWorkshopData(null);
    try {
      const qs = new URLSearchParams({ congressId: selectedCongressId });
      const res = await fetch(`/api/reports/workshop-reservations?${qs.toString()}`);
      if (!res.ok) {
        const raw: unknown = await res.json().catch(() => ({}));
        const err = ProblemDetailSchema.safeParse(raw);
        toast.error(err.success ? err.data.detail : "Error al cargar el reporte de talleres.");
        return;
      }
      const raw: unknown = await res.json();
      const parsed = WorkshopReservationReportSchema.safeParse(raw);
      if (!parsed.success) {
        toast.error("Respuesta inesperada del servidor.");
        return;
      }
      setWorkshopData(parsed.data);
    } catch {
      toast.error("Error de conexion. Intenta de nuevo.");
    } finally {
      setWorkshopLoading(false);
    }
  }, [selectedCongressId, toast]);

  // ── Export helper ────────────────────────────────────────────────────────────

  function openExport(path: string): void {
    window.open(path, "_blank", "noopener,noreferrer");
  }

  function buildExportUrl(type: TabId): string {
    if (selectedCongressId === null) return "#";
    const base =
      type === "participants"
        ? "/api/reports/participants/export"
        : type === "attendance"
          ? "/api/reports/attendance-by-activity/export"
          : "/api/reports/workshop-reservations/export";
    const qs = new URLSearchParams({ congressId: selectedCongressId });
    if (type === "participants" && participantType !== "") qs.set("type", participantType);
    if (type === "attendance") {
      if (attendanceDateFrom !== "") qs.set("dateFrom", attendanceDateFrom);
      if (attendanceDateTo !== "") qs.set("dateTo", attendanceDateTo);
    }
    return `${base}?${qs.toString()}`;
  }

  // ── Tab change ───────────────────────────────────────────────────────────────

  function handleTabChange(tab: TabId): void {
    setActiveTab(tab);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6" data-testid="congress-admin-reports-page">
      <PageHeader
        title="Reportes"
        description="Consulta y exporta reportes de tus congresos."
      />

      {/* Congress selector */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-5">
        <Label htmlFor="congress-selector" className="mb-2 block font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
          Congreso
        </Label>
        <div className="max-w-md" data-testid="congress-selector">
          <CongressCombobox
            id="congress-selector"
            congresses={congresses}
            value={selectedCongressId}
            onChange={(id) => {
              setSelectedCongressId(id);
              setParticipantData(null);
              setAttendanceData(null);
              setWorkshopData(null);
            }}
            placeholder="Selecciona un congreso para ver reportes"
          />
        </div>
        {selectedCongressId === null && (
          <p className="mt-2 font-secondary text-xs text-[var(--color-text-secondary)]">
            Selecciona un congreso para habilitar los reportes.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div>
        <div
          className="flex gap-1 rounded-t-[var(--radius-md)] border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] px-4 pt-3"
          role="tablist"
          aria-label="Tipos de reporte"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              disabled={selectedCongressId === null}
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-t-[var(--radius-sm)] px-4 py-2 font-sans text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                activeTab === tab.id
                  ? "border-b-2 border-[var(--color-primary)] bg-[var(--color-white)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-white)] hover:text-[var(--color-primary-text)]"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-b-[var(--radius-md)] rounded-tr-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-5">
          {/* ── Participants tab ─────────────────────────────────────────────── */}
          {activeTab === "participants" && (
            <div
              role="tabpanel"
              id="tabpanel-participants"
              aria-labelledby="tab-participants"
              className="flex flex-col gap-5"
              data-testid="tab-panel-participants"
            >
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="participant-type" className="font-secondary text-xs font-medium text-[var(--color-text-primary)]">
                    Tipo de participacion
                  </Label>
                  <select
                    id="participant-type"
                    value={participantType}
                    onChange={(e) => setParticipantType(e.target.value)}
                    className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-white)] px-3 font-secondary text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
                    data-testid="participant-type-filter"
                  >
                    {PARTICIPATION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => void fetchParticipants()}
                    disabled={selectedCongressId === null || participantLoading}
                    className="inline-flex min-h-[44px] items-center gap-2"
                    data-testid="btn-fetch-participants"
                  >
                    {participantLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Search size={15} strokeWidth={1.5} />
                    )}
                    Buscar
                  </Button>

                  {participantData !== null && (
                    <Button
                      variant="outline"
                      onClick={() => void fetchParticipants()}
                      className="min-h-[44px]"
                      title="Actualizar reporte"
                    >
                      <RotateCcw size={15} strokeWidth={1.5} />
                    </Button>
                  )}

                  {participantData !== null && participantData.items.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => openExport(buildExportUrl("participants"))}
                      className="inline-flex min-h-[44px] items-center gap-2"
                      data-testid="btn-export-participants"
                    >
                      <FileDown size={15} strokeWidth={1.5} />
                      Exportar PDF
                    </Button>
                  )}
                </div>
              </div>

              {participantLoading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" />
                </div>
              )}

              {!participantLoading && participantData !== null && (
                <div className="flex flex-col gap-3" data-testid="participants-report-result">
                  <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
                    {participantData.totalItems} participante{participantData.totalItems !== 1 ? "s" : ""} encontrado{participantData.totalItems !== 1 ? "s" : ""}
                  </p>
                  <ReportTable
                    columns={PARTICIPANT_COLUMNS}
                    data={participantData.items}
                    caption="Listado de participantes"
                  />
                </div>
              )}

              {!participantLoading && participantData === null && (
                <EmptyState
                  icon={<Users size={24} strokeWidth={1.5} />}
                  title="Sin datos"
                  description="Selecciona un congreso y haz clic en Buscar para ver el reporte."
                />
              )}
            </div>
          )}

          {/* ── Attendance tab ───────────────────────────────────────────────── */}
          {activeTab === "attendance" && (
            <div
              role="tabpanel"
              id="tabpanel-attendance"
              aria-labelledby="tab-attendance"
              className="flex flex-col gap-5"
              data-testid="tab-panel-attendance"
            >
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="attendance-date-from" className="font-secondary text-xs font-medium text-[var(--color-text-primary)]">
                    Fecha desde
                  </Label>
                  <Input
                    id="attendance-date-from"
                    type="date"
                    value={attendanceDateFrom}
                    onChange={(e) => setAttendanceDateFrom(e.target.value)}
                    className="h-9 w-40"
                    data-testid="attendance-date-from"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="attendance-date-to" className="font-secondary text-xs font-medium text-[var(--color-text-primary)]">
                    Fecha hasta
                  </Label>
                  <Input
                    id="attendance-date-to"
                    type="date"
                    value={attendanceDateTo}
                    onChange={(e) => setAttendanceDateTo(e.target.value)}
                    className="h-9 w-40"
                    data-testid="attendance-date-to"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => void fetchAttendance()}
                    disabled={selectedCongressId === null || attendanceLoading}
                    className="inline-flex min-h-[44px] items-center gap-2"
                    data-testid="btn-fetch-attendance"
                  >
                    {attendanceLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Search size={15} strokeWidth={1.5} />
                    )}
                    Buscar
                  </Button>

                  {attendanceData !== null && attendanceData.items.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => openExport(buildExportUrl("attendance"))}
                      className="inline-flex min-h-[44px] items-center gap-2"
                      data-testid="btn-export-attendance"
                    >
                      <FileDown size={15} strokeWidth={1.5} />
                      Exportar PDF
                    </Button>
                  )}
                </div>
              </div>

              {attendanceLoading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" />
                </div>
              )}

              {!attendanceLoading && attendanceData !== null && (
                <div className="flex flex-col gap-3" data-testid="attendance-report-result">
                  <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
                    {attendanceData.totalItems} actividad{attendanceData.totalItems !== 1 ? "es" : ""} con registro
                  </p>
                  <ReportTable
                    columns={ATTENDANCE_COLUMNS}
                    data={attendanceData.items}
                    caption="Asistencia por actividad"
                  />
                </div>
              )}

              {!attendanceLoading && attendanceData === null && (
                <EmptyState
                  icon={<ClipboardCheck size={24} strokeWidth={1.5} />}
                  title="Sin datos"
                  description="Selecciona un congreso y haz clic en Buscar para ver el reporte."
                />
              )}
            </div>
          )}

          {/* ── Workshops tab ────────────────────────────────────────────────── */}
          {activeTab === "workshops" && (
            <div
              role="tabpanel"
              id="tabpanel-workshops"
              aria-labelledby="tab-workshops"
              className="flex flex-col gap-5"
              data-testid="tab-panel-workshops"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void fetchWorkshops()}
                  disabled={selectedCongressId === null || workshopLoading}
                  className="inline-flex min-h-[44px] items-center gap-2"
                  data-testid="btn-fetch-workshops"
                >
                  {workshopLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Search size={15} strokeWidth={1.5} />
                  )}
                  Buscar
                </Button>

                {workshopData !== null && workshopData.items.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => openExport(buildExportUrl("workshops"))}
                    className="inline-flex min-h-[44px] items-center gap-2"
                    data-testid="btn-export-workshops"
                  >
                    <FileDown size={15} strokeWidth={1.5} />
                    Exportar PDF
                  </Button>
                )}
              </div>

              {workshopLoading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" />
                </div>
              )}

              {!workshopLoading && workshopData !== null && (
                <div className="flex flex-col gap-3" data-testid="workshops-report-result">
                  <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
                    {workshopData.totalItems} taller{workshopData.totalItems !== 1 ? "es" : ""} con reservas
                  </p>
                  <ReportTable
                    columns={WORKSHOP_COLUMNS}
                    data={workshopData.items}
                    caption="Reservas de talleres"
                  />
                </div>
              )}

              {!workshopLoading && workshopData === null && (
                <EmptyState
                  icon={<BookOpen size={24} strokeWidth={1.5} />}
                  title="Sin datos"
                  description="Selecciona un congreso y haz clic en Buscar para ver el reporte."
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* G4 pending notice */}
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <BarChart3 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--color-text-secondary)]" />
        <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
          El reporte de <strong>Ganancias por Congreso</strong> estara disponible proximamente (requiere integracion con el servicio de pagos).
        </p>
      </div>
    </div>
  );
}
