"use client";

import { useState } from "react";
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
import {
  CreateRoomSchema,
  type CreateRoomData,
  type RoomData,
} from "@/lib/validators/room";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  congressId: string;
  mode: "create" | "edit";
  room?: RoomData | undefined;
  onSuccess: () => void;
}

export function RoomFormDialog({
  open,
  onOpenChange,
  congressId,
  mode,
  room,
  onSuccess,
}: RoomFormDialogProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editDefaults =
    mode === "edit" && room !== undefined
      ? {
          name: room.name,
          capacity: room.capacity ?? undefined,
          location: room.location ?? undefined,
        }
      : {};

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoomData>({
    resolver: zodResolver(CreateRoomSchema),
    defaultValues: editDefaults,
  });

  function handleOpenChange(value: boolean): void {
    if (!value) {
      reset();
    }
    onOpenChange(value);
  }

  const onSubmit: SubmitHandler<CreateRoomData> = async (data): Promise<void> => {
    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? `/api/congresses/${congressId}/rooms`
          : `/api/rooms/${room?.id ?? ""}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
          ? "Sala creada correctamente."
          : "Sala actualizada correctamente.",
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

  const title = mode === "create" ? "Nueva sala" : "Editar sala";
  const description =
    mode === "create"
      ? "Completa los datos para crear una nueva sala."
      : "Modifica los datos de la sala.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[440px]"
        data-testid="room-form-dialog"
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
              htmlFor="room-name"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Nombre
            </Label>
            <Input
              id="room-name"
              type="text"
              disabled={isSubmitting}
              aria-invalid={errors.name !== undefined}
              data-testid="room-name-input"
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

          {/* Capacity */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="room-capacity"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Capacidad (opcional)
            </Label>
            <Input
              id="room-capacity"
              type="number"
              min="1"
              disabled={isSubmitting}
              aria-invalid={errors.capacity !== undefined}
              placeholder="Sin limite"
              {...register("capacity", { valueAsNumber: true })}
            />
            {errors.capacity !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.capacity.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="room-location"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Ubicacion (opcional)
            </Label>
            <Input
              id="room-location"
              type="text"
              disabled={isSubmitting}
              placeholder="Ej: Edificio T1, Salon 201"
              {...register("location")}
            />
          </div>

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
              data-testid="room-submit-button"
            >
              {isSubmitting
                ? "Guardando..."
                : mode === "create"
                  ? "Crear sala"
                  : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
