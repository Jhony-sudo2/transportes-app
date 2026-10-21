"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActivityBadge } from "@/components/domain/ActivityBadge";
import {
  CreateActivitySchema,
  type CreateActivityData,
  type ActivityData,
} from "@/lib/validators/activity";
import { type RoomData } from "@/lib/validators/room";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  congressId: string;
  mode: "create" | "edit";
  activity?: ActivityData | undefined;
  onSuccess: () => void;
  rooms: RoomData[];
  loadingRooms: boolean;
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  congressId,
  mode,
  activity,
  onSuccess,
  rooms,
  loadingRooms,
}: ActivityFormDialogProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [watchedType, setWatchedType] = useState<"PONENCIA" | "TALLER">(
    mode === "edit" && activity !== undefined ? activity.type : "PONENCIA",
  );

  const editDefaults =
    mode === "edit" && activity !== undefined
      ? {
          name: activity.name,
          description: activity.description,
          type: activity.type,
          roomId: activity.roomId,
          startTime: activity.startTime.slice(0, 16),
          endTime: activity.endTime.slice(0, 16),
          leaders: activity.leaders,
          workshopCapacity: activity.workshopCapacity ?? undefined,
        }
      : {
          type: "PONENCIA" as const,
          leaders: [] as string[],
        };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateActivityData>({
    resolver: zodResolver(CreateActivitySchema),
    defaultValues: editDefaults,
  });

  const typeValue = watch("type");

  useEffect(() => {
    if (typeValue === "PONENCIA" || typeValue === "TALLER") {
      setWatchedType(typeValue);
    }
  }, [typeValue]);

  function handleOpenChange(value: boolean): void {
    if (!value) {
      reset();
      setWatchedType(
        mode === "edit" && activity !== undefined ? activity.type : "PONENCIA",
      );
    }
    onOpenChange(value);
  }

  const onSubmit: SubmitHandler<CreateActivityData> = async (data): Promise<void> => {
    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? `/api/congresses/${congressId}/activities`
          : `/api/activities/${activity?.id ?? ""}`;
      const method = mode === "create" ? "POST" : "PUT";

      const payload =
        mode === "edit"
          ? {
              name: data.name,
              description: data.description,
              roomId: data.roomId,
              startTime: data.startTime,
              endTime: data.endTime,
              leaders: data.leaders,
              workshopCapacity: data.workshopCapacity,
            }
          : data;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const errorParsed = ProblemDetailSchema.safeParse(body);
        const code = errorParsed.success
          ? errorParsed.data.code
          : "system.internal_error";
        const message =
          ERROR_MESSAGES[code] ??
          ERROR_MESSAGES["system.internal_error"] ??
          "Error inesperado.";
        toast.error(message);
        return;
      }

      toast.success(
        mode === "create"
          ? "Actividad creada correctamente."
          : "Actividad actualizada correctamente.",
      );
      reset();
      onOpenChange(false);
      router.refresh();
      onSuccess();
    } catch {
      toast.error(
        ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Nueva actividad" : "Editar actividad";
  const description =
    mode === "create"
      ? "Completa los datos para crear una nueva actividad."
      : "Modifica los datos de la actividad. El tipo no puede cambiarse.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[520px]"
        data-testid="activity-form-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
            {title}
          </DialogTitle>
          <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          noValidate
          className="flex flex-col gap-4 py-2"
        >
          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="activity-name"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Nombre
            </Label>
            <Input
              id="activity-name"
              type="text"
              disabled={isSubmitting}
              aria-invalid={errors.name !== undefined}
              data-testid="activity-name-input"
              {...register("name")}
            />
            {errors.name !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="activity-description"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Descripcion
            </Label>
            <textarea
              id="activity-description"
              rows={2}
              disabled={isSubmitting}
              aria-invalid={errors.description !== undefined}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-secondary text-sm text-[var(--color-text-primary-black)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("description")}
            />
            {errors.description !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Type — editable only in create mode */}
          {mode === "create" ? (
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="activity-type"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Tipo
              </Label>
              <select
                id="activity-type"
                disabled={isSubmitting}
                aria-invalid={errors.type !== undefined}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-secondary text-sm text-[var(--color-text-primary-black)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("type")}
              >
                <option value="PONENCIA">Ponencia</option>
                <option value="TALLER">Taller</option>
              </select>
              {errors.type !== undefined && (
                <p
                  className="font-secondary text-xs text-[var(--color-error)]"
                  role="alert"
                >
                  {errors.type.message}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="font-secondary text-sm text-[var(--color-text-primary)]">
                Tipo
              </span>
              <div>
                <ActivityBadge type={activity?.type ?? "PONENCIA"} />
              </div>
            </div>
          )}

          {/* Room selector */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="activity-room"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Sala
            </Label>
            <select
              id="activity-room"
              disabled={isSubmitting || loadingRooms}
              aria-invalid={errors.roomId !== undefined}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-secondary text-sm text-[var(--color-text-primary-black)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("roomId")}
            >
              <option value="">
                {loadingRooms ? "Cargando salas..." : "Selecciona una sala"}
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                  {room.capacity !== null ? ` (cap. ${room.capacity})` : ""}
                </option>
              ))}
            </select>
            {errors.roomId !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.roomId.message}
              </p>
            )}
          </div>

          {/* Times row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="activity-start"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Inicio
              </Label>
              <Input
                id="activity-start"
                type="datetime-local"
                disabled={isSubmitting}
                aria-invalid={errors.startTime !== undefined}
                data-testid="activity-start-input"
                {...register("startTime")}
              />
              {errors.startTime !== undefined && (
                <p
                  className="font-secondary text-xs text-[var(--color-error)]"
                  role="alert"
                  data-testid="activity-start-error"
                >
                  {errors.startTime.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="activity-end"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Fin
              </Label>
              <Input
                id="activity-end"
                type="datetime-local"
                disabled={isSubmitting}
                aria-invalid={errors.endTime !== undefined}
                data-testid="activity-end-input"
                {...register("endTime")}
              />
              {errors.endTime !== undefined && (
                <p
                  className="font-secondary text-xs text-[var(--color-error)]"
                  role="alert"
                  data-testid="activity-end-error"
                >
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Workshop capacity — visible only when type is TALLER */}
          {watchedType === "TALLER" && (
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="activity-capacity"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Capacidad del taller
              </Label>
              <Input
                id="activity-capacity"
                type="number"
                min="1"
                disabled={isSubmitting}
                aria-invalid={errors.workshopCapacity !== undefined}
                {...register("workshopCapacity", { valueAsNumber: true })}
              />
              {errors.workshopCapacity !== undefined && (
                <p
                  className="font-secondary text-xs text-[var(--color-error)]"
                  role="alert"
                >
                  {errors.workshopCapacity.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary)] active:scale-[0.99]"
              data-testid="activity-submit-button"
            >
              {isSubmitting
                ? "Guardando..."
                : mode === "create"
                  ? "Crear actividad"
                  : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
