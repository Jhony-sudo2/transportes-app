"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateInstitutionSchema, type InstitutionData, type CreateInstitutionData } from "@/lib/validators/institution";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

interface InstitutionFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  institution: InstitutionData | undefined;
  onSuccess: () => void;
  onClose: () => void;
}

function FieldError({ message }: { message: string | undefined }): React.ReactElement | null {
  if (message === undefined) return null;
  return (
    <p className="mt-1 font-secondary text-xs text-[var(--color-error)]">{message}</p>
  );
}

export function InstitutionFormDialog({
  open,
  mode,
  institution,
  onSuccess,
  onClose,
}: InstitutionFormDialogProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInstitutionData>({
    resolver: zodResolver(CreateInstitutionSchema),
    defaultValues: {
      name: institution?.name ?? "",
      description: institution?.description ?? "",
      contactEmail: institution?.contactEmail ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: institution?.name ?? "",
        description: institution?.description ?? "",
        contactEmail: institution?.contactEmail ?? "",
      });
      setServerError(null);
    }
  }, [open, institution, reset]);

  const onSubmit = async (data: CreateInstitutionData): Promise<void> => {
    setServerError(null);
    const url =
      mode === "create"
        ? "/api/institutions"
        : `/api/institutions/${institution?.id ?? ""}`;
    const method = mode === "create" ? "POST" : "PUT";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      onSuccess();
    } else {
      const body: unknown = await res.json();
      const parsed = ProblemDetailSchema.safeParse(body);
      setServerError(parsed.success ? parsed.data.detail : "Error al guardar la institucion.");
    }
  };

  const title = mode === "create" ? "Nueva institucion" : "Editar institucion";
  const submitLabel = mode === "create" ? "Crear institucion" : "Guardar cambios";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        data-testid="institution-form-dialog"
        className="bg-[var(--color-white)]"
      >
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="inst-name">Nombre</Label>
            <Input
              id="inst-name"
              data-testid="institution-name-input"
              placeholder="Nombre de la institucion"
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="inst-description">Descripcion</Label>
            <Input
              id="inst-description"
              placeholder="Descripcion de la institucion"
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="inst-contactEmail">Correo de contacto</Label>
            <Input
              id="inst-contactEmail"
              type="email"
              placeholder="contacto@institucion.edu"
              {...register("contactEmail")}
            />
            <FieldError message={errors.contactEmail?.message} />
          </div>
          {serverError !== null && (
            <p className="font-secondary text-xs text-[var(--color-error)]">{serverError}</p>
          )}
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="institution-submit-button"
              disabled={isSubmitting}
              className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 min-h-[44px]"
            >
              {isSubmitting ? "Guardando..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
