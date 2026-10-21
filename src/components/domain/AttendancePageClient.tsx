"use client";

import { useState, useCallback, useEffect } from "react";
import { ClipboardCheck, ClipboardList, Award } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CongressCombobox } from "@/components/domain/CongressCombobox";
import { UserSearchCombobox } from "@/components/domain/UserSearchCombobox";
import {
  AttendanceListSchema,
  RegisterAttendanceSchema,
  type AttendanceData,
  type RegisterAttendanceData,
} from "@/lib/validators/attendance";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ActivityListSchema, type ActivityData } from "@/lib/validators/activity";
import { type CongressData } from "@/lib/validators/congress";
import { type UserData } from "@/lib/validators/user";
import { formatDateTime } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

interface AttendancePageClientProps {
  congresses: CongressData[];
  initialCongressId?: string | undefined;
  initialActivityId?: string | undefined;
}

export function AttendancePageClient({
  congresses,
  initialCongressId,
  initialActivityId,
}: AttendancePageClientProps): React.ReactElement {
  const toast = useToast();

  const [selectedCongressId, setSelectedCongressId] = useState<string | null>(
    initialCongressId ?? null,
  );
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<UserData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RegisterAttendanceData>({
    resolver: zodResolver(RegisterAttendanceSchema),
    defaultValues: { activityId: "", personalId: "" },
  });

  const selectedActivityId = watch("activityId");

  const fetchAttendanceHistory = useCallback(
    async (activityId: string) => {
      if (activityId === "") return;
      setLoadingHistory(true);
      try {
        const res = await fetch(
          `/api/attendance?activityId=${encodeURIComponent(activityId)}`,
        );
        if (!res.ok) return;
        const raw: unknown = await res.json();
        const parsed = AttendanceListSchema.safeParse(raw);
        if (parsed.success) {
          setAttendanceHistory(parsed.data.items);
        }
      } catch {
        // ignore — history loads silently
      } finally {
        setLoadingHistory(false);
      }
    },
    [],
  );

  const fetchActivities = useCallback(
    async (congressId: string, preSelectActivityId?: string) => {
      setLoadingActivities(true);
      setActivities([]);
      setValue("activityId", "");
      setAttendanceHistory([]);
      try {
        const res = await fetch(`/api/congresses/${congressId}/activities`);
        if (!res.ok) {
          toast.error("Error al cargar las actividades.");
          return;
        }
        const raw: unknown = await res.json();
        const parsed = ActivityListSchema.safeParse(raw);
        if (!parsed.success) {
          toast.error("Error al procesar las actividades.");
          return;
        }
        setActivities(parsed.data.items);
        if (preSelectActivityId !== undefined && preSelectActivityId !== "") {
          setValue("activityId", preSelectActivityId);
          void fetchAttendanceHistory(preSelectActivityId);
        }
      } catch {
        toast.error("Error de conexion al cargar las actividades.");
      } finally {
        setLoadingActivities(false);
      }
    },
    [setValue, toast, fetchAttendanceHistory],
  );

  useEffect(() => {
    if (initialCongressId !== undefined && initialCongressId !== "") {
      void fetchActivities(initialCongressId, initialActivityId);
    }
    // run only on mount; deps are stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCongressChange = async (congressId: string | null) => {
    setSelectedCongressId(congressId);
    if (congressId !== null) {
      await fetchActivities(congressId);
    } else {
      setActivities([]);
      setValue("activityId", "");
    }
  };

  const onRegisterAttendance = async (data: RegisterAttendanceData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body: unknown = await res.json();
        const parsed = ProblemDetailSchema.safeParse(body);
        toast.error(parsed.success ? parsed.data.detail : "Error al registrar asistencia.");
        return;
      }
      toast.success("Asistencia registrada exitosamente.");
      setSelectedParticipant(null);
      reset({ activityId: data.activityId, personalId: "" });
      void fetchAttendanceHistory(data.activityId);
    } catch {
      toast.error("Error de conexion al registrar asistencia.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = async () => {
    if (selectedActivityId === "") {
      toast.error("Selecciona una actividad para ver el historial.");
      return;
    }
    await fetchAttendanceHistory(selectedActivityId);
  };

  if (congresses.length === 0) {
    return (
      <div className="flex flex-col gap-6" data-testid="congress-admin-attendance-page">
        <PageHeader
          title="Registro de asistencia"
          description="Registra y consulta la asistencia a actividades."
        />
        <EmptyState
          icon={<ClipboardList size={28} strokeWidth={1.5} />}
          title="No tienes congresos"
          description="Crea un congreso primero para poder registrar asistencia."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="congress-admin-attendance-page">
      <PageHeader
        title="Registro de asistencia"
        description="Registra y consulta la asistencia a actividades."
      />

      {/* Nota sobre diplomas */}
      <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <Award size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--color-primary-text)]" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <p className="font-secondary text-sm font-medium text-[var(--color-text-primary-black)]">
            Diplomas automaticos
          </p>
          <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
            Los diplomas se generan automaticamente: <strong>Participacion</strong> al registrar 3 o mas asistencias por congreso,
            y <strong>Liderazgo</strong> al asignar un ponente o tallerista como lider de una actividad. El participante los ve en su seccion de diplomas.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Seccion 1: Registro */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck
              size={20}
              strokeWidth={1.5}
              className="text-[var(--color-primary-text)]"
            />
            <h2 className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Registrar asistencia
            </h2>
          </div>

          <form
            onSubmit={(e) => void handleSubmit(onRegisterAttendance)(e)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="attendance-congress-select">Congreso</Label>
              <CongressCombobox
                id="attendance-congress-select"
                congresses={congresses}
                value={selectedCongressId}
                onChange={(id) => {
                  void handleCongressChange(id);
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="attendance-activity-select">Actividad</Label>
              <select
                id="attendance-activity-select"
                value={selectedActivityId}
                onChange={(e) => {
                  setValue("activityId", e.target.value);
                  void fetchAttendanceHistory(e.target.value);
                }}
                disabled={selectedCongressId === null || loadingActivities}
                className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] px-3 font-secondary text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="attendance-activity-select"
              >
                <option value="">
                  {loadingActivities ? "Cargando actividades..." : "-- Selecciona una actividad --"}
                </option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name} ({activity.type})
                  </option>
                ))}
              </select>
              {errors.activityId !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]">
                  {errors.activityId.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="attendance-participant-search">Participante</Label>
              <UserSearchCombobox
                selected={selectedParticipant}
                onSelect={(user) => {
                  setSelectedParticipant(user);
                  setValue("personalId", user?.personalId ?? "");
                }}
                congressId={selectedCongressId ?? undefined}
                placeholder="Buscar participantes inscritos..."
                preloadEnrolled
                data-testid="attendance-participant-search"
              />
              <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
                O ingresa la identificacion directamente:
              </p>
              <Input
                id="attendance-personalid-input"
                placeholder="Ej. 12345678 o ABC123"
                {...register("personalId")}
                className="h-11"
                data-testid="attendance-personalid-input"
              />
              {errors.personalId !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]">
                  {errors.personalId.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={submitting || selectedCongressId === null}
                className="min-h-[44px] bg-[var(--color-primary)] text-white hover:scale-[1.01] active:scale-[0.99]"
                data-testid="attendance-register-button"
              >
                {submitting ? "Registrando..." : "Registrar asistencia"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleViewHistory()}
                disabled={selectedActivityId === "" || loadingHistory}
                className="min-h-[44px] border-[var(--color-border)] text-[var(--color-text-primary)]"
                data-testid="attendance-view-history-button"
              >
                {loadingHistory ? "Cargando..." : "Ver historial"}
              </Button>
            </div>
          </form>
        </div>

        {/* Seccion 2: Historial */}
        {attendanceHistory.length > 0 && (
          <div className="flex flex-col gap-3 animate-fade-in-up">
            <h2 className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Historial de asistencia
            </h2>
            <div
              className="overflow-x-auto rounded-lg border border-[var(--color-border)]"
              data-testid="attendance-history-table"
            >
              <table className="w-full border-collapse font-secondary text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]">
                      Identificacion
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-text-primary)]">
                      Fecha de registro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record, idx) => (
                    <tr
                      key={record.id}
                      className={`border-b border-[var(--color-border)] transition-colors duration-150 ${
                        idx % 2 === 0 ? "bg-[var(--color-white)]" : "bg-[var(--color-surface)]"
                      }`}
                    >
                      <td className="px-4 py-3 text-[var(--color-text-primary)]">
                        {record.personalId}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-primary)]">
                        {formatDateTime(record.registeredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
