"use client";

import { useState } from "react";
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
  CreateGuestSpeakerSchema,
  UserSchema,
  type CreateGuestSpeakerData,
  type UserData,
} from "@/lib/validators/user";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { useToast } from "@/hooks/useToast";

interface CreateGuestSpeakerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (created: UserData) => void;
}

export function CreateGuestSpeakerDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateGuestSpeakerDialogProps): React.ReactElement {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGuestSpeakerData>({
    resolver: zodResolver(CreateGuestSpeakerSchema),
  });

  function handleOpenChange(value: boolean): void {
    if (!value) {
      reset();
    }
    onOpenChange(value);
  }

  const onSubmit: SubmitHandler<CreateGuestSpeakerData> = async (data): Promise<void> => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users/guest-speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const errorParsed = ProblemDetailSchema.safeParse(body);
        const detail = errorParsed.success
          ? errorParsed.data.detail
          : "Error al registrar el ponente invitado.";
        toast.error(detail);
        return;
      }

      const body: unknown = await response.json();
      const parsed = UserSchema.safeParse(body);
      if (!parsed.success) {
        toast.error("Error al procesar la respuesta del servidor.");
        return;
      }

      toast.success("Ponente invitado registrado exitosamente.");
      reset();
      onOpenChange(false);
      onSuccess(parsed.data);
    } catch {
      toast.error("Error de conexion al registrar el ponente invitado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[480px]"
        data-testid="create-guest-speaker-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
            Nuevo ponente invitado
          </DialogTitle>
          <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
            Registra un ponente invitado que no tenga cuenta en el sistema.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          noValidate
          className="flex flex-col gap-4 py-2"
        >
          {/* Full name */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="gs-fullName"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Nombre completo
            </Label>
            <Input
              id="gs-fullName"
              type="text"
              disabled={isSubmitting}
              aria-invalid={errors.fullName !== undefined}
              data-testid="gs-fullName-input"
              {...register("fullName")}
            />
            {errors.fullName !== undefined && (
              <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Organization */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="gs-organization"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Organizacion
            </Label>
            <Input
              id="gs-organization"
              type="text"
              disabled={isSubmitting}
              aria-invalid={errors.organization !== undefined}
              data-testid="gs-organization-input"
              {...register("organization")}
            />
            {errors.organization !== undefined && (
              <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                {errors.organization.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="gs-email"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Correo electronico
            </Label>
            <Input
              id="gs-email"
              type="email"
              disabled={isSubmitting}
              aria-invalid={errors.email !== undefined}
              data-testid="gs-email-input"
              {...register("email")}
            />
            {errors.email !== undefined && (
              <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="gs-phone"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Telefono
            </Label>
            <Input
              id="gs-phone"
              type="tel"
              disabled={isSubmitting}
              aria-invalid={errors.phone !== undefined}
              data-testid="gs-phone-input"
              {...register("phone")}
            />
            {errors.phone !== undefined && (
              <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Personal ID */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="gs-personalId"
              className="font-secondary text-sm text-[var(--color-text-primary)]"
            >
              Identificacion personal
            </Label>
            <Input
              id="gs-personalId"
              type="text"
              disabled={isSubmitting}
              aria-invalid={errors.personalId !== undefined}
              placeholder="Solo letras y numeros"
              data-testid="gs-personalId-input"
              {...register("personalId")}
            />
            {errors.personalId !== undefined && (
              <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                {errors.personalId.message}
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
              data-testid="gs-submit-button"
            >
              {isSubmitting ? "Registrando..." : "Registrar ponente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
