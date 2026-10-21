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
import {
  CreateCongressSchema,
  type CreateCongressData,
  type CongressData,
} from "@/lib/validators/congress";
import type { InstitutionData } from "@/lib/validators/institution";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface CongressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  congress?: CongressData | undefined;
  institutions: InstitutionData[];
  onSuccess: () => void;
}

export function CongressFormDialog({
  open,
  onOpenChange,
  mode,
  congress,
  institutions,
  onSuccess,
}: CongressFormDialogProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editDefaults =
    mode === "edit" && congress !== undefined
      ? {
          name: congress.name,
          description: congress.description,
          startDate: congress.startDate,
          endDate: congress.endDate,
          location: congress.location,
          price: congress.price,
          institutionId: congress.institutionId,
        }
      : {};

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCongressData>({
    resolver: zodResolver(CreateCongressSchema),
    defaultValues: editDefaults,
  });

  useEffect(() => {
    if (open) {
      reset(editDefaults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, congress]);

  function handleOpenChange(value: boolean): void {
    if (!value) {
      reset();
    }
    onOpenChange(value);
  }

  const onSubmit: SubmitHandler<CreateCongressData> = async (data): Promise<void> => {
    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/congresses"
          : `/api/congresses/${congress?.id ?? ""}`;
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
          ? "Congreso creado correctamente."
          : "Congreso actualizado correctamente.",
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

  const title =
    mode === "create" ? "Nuevo congreso" : "Editar congreso";
  const description =
    mode === "create"
      ? "Completa los datos para crear un nuevo congreso."
      : "Modifica los datos del congreso.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[520px]"
        data-testid="congress-form-dialog"
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
              htmlFor="congress-name"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Nombre
            </Label>
            <Input
              id="congress-name"
              type="text"
              disabled={isSubmitting}
              aria-invalid={errors.name !== undefined}
              data-testid="congress-name-input"
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
              htmlFor="congress-description"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Descripcion
            </Label>
            <textarea
              id="congress-description"
              rows={3}
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

          {/* Institution */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="congress-institution"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Institucion
            </Label>
            <select
              id="congress-institution"
              disabled={isSubmitting}
              aria-invalid={errors.institutionId !== undefined}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-secondary text-sm text-[var(--color-text-primary-black)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("institutionId")}
            >
              <option value="">Selecciona una institucion</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
            {errors.institutionId !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.institutionId.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="congress-location"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Ubicacion
            </Label>
            <Input
              id="congress-location"
              type="text"
              disabled={isSubmitting}
              aria-invalid={errors.location !== undefined}
              {...register("location")}
            />
            {errors.location !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
              >
                {errors.location.message}
              </p>
            )}
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="congress-start-date"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Fecha de inicio
              </Label>
              <Input
                id="congress-start-date"
                type="date"
                disabled={isSubmitting}
                aria-invalid={errors.startDate !== undefined}
                {...register("startDate")}
              />
              {errors.startDate !== undefined && (
                <p
                  className="font-secondary text-xs text-[var(--color-error)]"
                  role="alert"
                >
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="congress-end-date"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Fecha de fin
              </Label>
              <Input
                id="congress-end-date"
                type="date"
                disabled={isSubmitting}
                aria-invalid={errors.endDate !== undefined}
                {...register("endDate")}
              />
              {errors.endDate !== undefined && (
                <p
                  className="font-secondary text-xs text-[var(--color-error)]"
                  role="alert"
                >
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="congress-price"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Precio (Q)
            </Label>
            <Input
              id="congress-price"
              type="number"
              step="0.01"
              min="35"
              disabled={isSubmitting}
              aria-invalid={errors.price !== undefined}
              data-testid="congress-price-input"
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price !== undefined && (
              <p
                className="font-secondary text-xs text-[var(--color-error)]"
                role="alert"
                data-testid="congress-price-error"
              >
                {errors.price.message}
              </p>
            )}
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
              data-testid="congress-submit-button"
            >
              {isSubmitting
                ? "Guardando..."
                : mode === "create"
                  ? "Crear congreso"
                  : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
