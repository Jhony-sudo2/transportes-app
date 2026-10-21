"use client";

import { useState, useCallback } from "react";
import { Plus, Building2, Pencil, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityBadge } from "@/components/domain/ActivityBadge";
import { ActivityFormDialog } from "@/components/domain/ActivityFormDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ActivityListSchema, type ActivityData } from "@/lib/validators/activity";
import { RoomListSchema, type RoomData } from "@/lib/validators/room";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { formatDateTime } from "@/lib/utils/format";
import { useToast } from "@/hooks/useToast";

interface ActivitiesScopedPageClientProps {
  congressId: string;
  congressName: string;
  initialActivities: ActivityData[];
}

export function ActivitiesScopedPageClient({
  congressId,
  congressName,
  initialActivities,
}: ActivitiesScopedPageClientProps): React.ReactElement {
  const toast = useToast();
  const [activities, setActivities] = useState<ActivityData[]>(initialActivities);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const loadRooms = useCallback(async (): Promise<void> => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch(`/api/congresses/${congressId}/rooms`);
      if (!res.ok) return;
      const raw: unknown = await res.json();
      const parsed = RoomListSchema.safeParse(raw);
      if (parsed.success) {
        setRooms(parsed.data.items);
      }
    } catch {
      /* silent */
    } finally {
      setIsLoadingRooms(false);
    }
  }, [congressId]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<ActivityData | undefined>(undefined);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ActivityData | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshActivities = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/congresses/${congressId}/activities`);
      if (!res.ok) return;
      const raw: unknown = await res.json();
      const parsed = ActivityListSchema.safeParse(raw);
      if (parsed.success) {
        setActivities(parsed.data.items);
      }
    } catch {
      /* silent */
    }
  }, [congressId]);

  function openCreate(): void {
    setEditTarget(undefined);
    setFormMode("create");
    void loadRooms();
    setFormOpen(true);
  }

  function openEdit(activity: ActivityData): void {
    setEditTarget(activity);
    setFormMode("edit");
    void loadRooms();
    setFormOpen(true);
  }

  function openDelete(activity: ActivityData): void {
    setDeleteTarget(activity);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (deleteTarget === undefined) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/activities/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.status === 204 || response.ok) {
        toast.success("Actividad eliminada correctamente.");
        setDeleteDialogOpen(false);
        setDeleteTarget(undefined);
        await refreshActivities();
        return;
      }

      const body: unknown = await response.json();
      const errorParsed = ProblemDetailSchema.safeParse(body);
      const code = errorParsed.success ? errorParsed.data.code : "system.internal_error";
      const message =
        ERROR_MESSAGES[code] ?? ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.";
      toast.error(message);
    } catch {
      toast.error(ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div data-testid="congress-activities-scoped-page" className="flex flex-col gap-6">
      <div>
        <Link
          href="/congress-admin/congresses"
          className="inline-flex items-center gap-1.5 font-secondary text-sm text-[var(--color-primary-text)] transition-opacity duration-200 hover:opacity-70"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Volver a mis congresos
        </Link>
      </div>

      <PageHeader
        title="Actividades"
        description={`Administra las actividades del congreso: ${congressName}`}
        action={
          <Button
            onClick={openCreate}
            className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nueva actividad
          </Button>
        }
      />

      {activities.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} strokeWidth={1.5} />}
          title="No hay actividades registradas"
          description="Agrega la primera actividad para este congreso."
          action={
            <Button
              onClick={openCreate}
              className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nueva actividad
            </Button>
          }
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="activities-list"
          aria-label="Lista de actividades"
        >
          {activities.map((activity, index) => (
            <li
              key={activity.id}
              className="animate-fade-in-up rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-elevated)]"
              style={
                index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-1 flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
                      {activity.name}
                    </h3>
                    <ActivityBadge type={activity.type} />
                  </div>
                  <p className="line-clamp-2 font-secondary text-xs text-[var(--color-text-primary)]">
                    {activity.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                    <span className="font-secondary">
                      Sala: {activity.roomId.slice(0, 8)}...
                    </span>
                    <span className="font-secondary">
                      {formatDateTime(activity.startTime)} &ndash;{" "}
                      {formatDateTime(activity.endTime)}
                    </span>
                    {activity.workshopCapacity !== null && (
                      <span className="font-secondary">
                        Capacidad: {activity.workshopCapacity}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(activity)}
                    className="min-h-[44px] border-[var(--color-border)] text-[var(--color-text-primary)]"
                    aria-label={`Editar actividad ${activity.name}`}
                  >
                    <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span className="ml-1.5">Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDelete(activity)}
                    className="min-h-[44px] border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white"
                    aria-label={`Eliminar actividad ${activity.name}`}
                  >
                    <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span className="ml-1.5">Eliminar</span>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        congressId={congressId}
        mode={formMode}
        activity={editTarget}
        onSuccess={() => {
          void refreshActivities();
        }}
        rooms={rooms}
        loadingRooms={isLoadingRooms}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Eliminar actividad
            </DialogTitle>
            <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
              Esta accion no se puede deshacer. Se eliminara la actividad{" "}
              <span className="font-medium text-[var(--color-text-primary-black)]">
                {deleteTarget?.name ?? ""}
              </span>{" "}
              y sus asignaciones de lideres.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteDialogOpen(false)}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void handleDeleteConfirm();
              }}
              className="min-h-[44px] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isDeleting ? "Eliminando..." : "Confirmar eliminacion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
