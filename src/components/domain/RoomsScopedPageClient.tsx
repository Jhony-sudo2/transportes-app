"use client";

import { useState, useCallback } from "react";
import { Plus, Building2, Pencil, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RoomFormDialog } from "@/components/domain/RoomFormDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RoomListSchema, type RoomData } from "@/lib/validators/room";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface RoomsScopedPageClientProps {
  congressId: string;
  congressName: string;
  initialRooms: RoomData[];
}

export function RoomsScopedPageClient({
  congressId,
  congressName,
  initialRooms,
}: RoomsScopedPageClientProps): React.ReactElement {
  const toast = useToast();
  const [rooms, setRooms] = useState<RoomData[]>(initialRooms);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<RoomData | undefined>(undefined);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoomData | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshRooms = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/congresses/${congressId}/rooms`);
      if (!res.ok) return;
      const raw: unknown = await res.json();
      const parsed = RoomListSchema.safeParse(raw);
      if (parsed.success) {
        setRooms(parsed.data.items);
      }
    } catch {
      /* silent — user still sees stale data */
    }
  }, [congressId]);

  function openCreate(): void {
    setEditTarget(undefined);
    setFormMode("create");
    setFormOpen(true);
  }

  function openEdit(room: RoomData): void {
    setEditTarget(room);
    setFormMode("edit");
    setFormOpen(true);
  }

  function openDelete(room: RoomData): void {
    setDeleteTarget(room);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (deleteTarget === undefined) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rooms/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.status === 204 || response.ok) {
        toast.success("Sala eliminada correctamente.");
        setDeleteDialogOpen(false);
        setDeleteTarget(undefined);
        await refreshRooms();
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
    <div data-testid="congress-rooms-scoped-page" className="flex flex-col gap-6">
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
        title="Salas"
        description={`Administra las salas del congreso: ${congressName}`}
        action={
          <Button
            onClick={openCreate}
            className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nueva sala
          </Button>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} strokeWidth={1.5} />}
          title="No hay salas registradas"
          description="Agrega la primera sala para este congreso."
          action={
            <Button
              onClick={openCreate}
              className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nueva sala
            </Button>
          }
        />
      ) : (
        <ul
          className="flex flex-col gap-3"
          data-testid="rooms-list"
          aria-label="Lista de salas"
        >
          {rooms.map((room, index) => (
            <li
              key={room.id}
              className="animate-fade-in-up rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-elevated)]"
              style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <h3 className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
                    {room.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="font-secondary text-xs text-[var(--color-text-secondary)]">
                      Capacidad:{" "}
                      {room.capacity !== null ? room.capacity.toString() : "Sin limite"}
                    </span>
                    {room.location !== null && room.location !== "" && (
                      <span className="font-secondary text-xs text-[var(--color-text-secondary)]">
                        {room.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(room)}
                    className="min-h-[44px] border-[var(--color-border)] text-[var(--color-text-primary)]"
                    aria-label={`Editar sala ${room.name}`}
                  >
                    <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span className="ml-1.5">Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDelete(room)}
                    className="min-h-[44px] border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white"
                    aria-label={`Eliminar sala ${room.name}`}
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

      <RoomFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        congressId={congressId}
        mode={formMode}
        room={editTarget}
        onSuccess={() => {
          void refreshRooms();
        }}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Eliminar sala
            </DialogTitle>
            <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
              Esta accion no se puede deshacer. Se eliminara la sala{" "}
              <span className="font-medium text-[var(--color-text-primary-black)]">
                {deleteTarget?.name ?? ""}
              </span>
              .
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
