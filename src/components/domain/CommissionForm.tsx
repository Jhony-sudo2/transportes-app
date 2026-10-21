"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UpdateSystemConfigSchema, type UpdateSystemConfigData } from "@/lib/validators/system-config";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CommissionFormProps {
  currentPercent: number;
}

export function CommissionForm({ currentPercent }: CommissionFormProps): React.ReactElement {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSystemConfigData>({
    resolver: zodResolver(UpdateSystemConfigSchema),
    defaultValues: { commissionPercent: currentPercent },
  });

  const onSubmit = async (data: UpdateSystemConfigData): Promise<void> => {
    setServerError(null);
    setSuccessMessage(null);
    const res = await fetch("/api/system/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSuccessMessage("Porcentaje de comision actualizado");
      router.refresh();
    } else {
      const body: unknown = await res.json();
      const parsed = ProblemDetailSchema.safeParse(body);
      setServerError(parsed.success ? parsed.data.detail : "Error al actualizar la configuracion.");
    }
  };

  return (
    <div
      data-testid="commission-form"
      className="animate-fade-in-up rounded-lg border border-[var(--color-border)] bg-[var(--color-white)] p-6"
    >
      <h2 className="mb-1 font-sans text-base font-medium text-[var(--color-text-primary-black)]">
        Porcentaje de comision de la plataforma
      </h2>
      <p className="mb-6 font-secondary text-sm text-[var(--color-text-secondary)]">
        Este porcentaje se aplica a cada pago de inscripcion realizado en la plataforma.
        El valor debe estar entre 0 y 100.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-sm">
        <div className="flex flex-col gap-1">
          <Label htmlFor="commissionPercent">Porcentaje (%)</Label>
          <Input
            id="commissionPercent"
            data-testid="commission-percent-input"
            type="number"
            min={0}
            max={100}
            step={0.01}
            placeholder="10.00"
            {...register("commissionPercent", { valueAsNumber: true })}
            className="h-11"
          />
          {errors.commissionPercent !== undefined && (
            <p className="mt-1 font-secondary text-xs text-[var(--color-error)]">
              {errors.commissionPercent.message}
            </p>
          )}
        </div>
        {serverError !== null && (
          <p className="font-secondary text-xs text-[var(--color-error)]">{serverError}</p>
        )}
        {successMessage !== null && (
          <p className="font-secondary text-xs text-[var(--color-success-text)]">{successMessage}</p>
        )}
        <div>
          <Button
            type="submit"
            data-testid="commission-save-button"
            disabled={isSubmitting}
            className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 min-h-[44px]"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
