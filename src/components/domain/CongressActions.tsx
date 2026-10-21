"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { CreateEnrollmentSchema, type CreateEnrollmentData } from "@/lib/validators/enrollment";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";

interface CongressActionsProps {
  congressId: string;
  hasOpenCall: boolean;
}

export function CongressActions({ congressId, hasOpenCall }: CongressActionsProps): React.ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEnrollmentData>({
    resolver: zodResolver(CreateEnrollmentSchema),
  });

  async function checkAuth(): Promise<boolean> {
    try {
      const res = await fetch("/api/users/me");
      return res.ok;
    } catch {
      return false;
    }
  }

  async function handleEnrollClick(): Promise<void> {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setIsDialogOpen(true);
  }

  async function onSubmit(data: CreateEnrollmentData): Promise<void> {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/congresses/${congressId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentDate: data.paymentDate }),
      });

      const body: unknown = await res.json();

      if (!res.ok) {
        const errorParsed = ProblemDetailSchema.safeParse(body);
        const code = errorParsed.success
          ? errorParsed.data.code
          : "system.internal_error";
        const message =
          ERROR_MESSAGES[code] ??
          ERROR_MESSAGES["system.internal_error"] ??
          "Ocurrio un error inesperado. Intenta de nuevo mas tarde.";
        toast.error(message);
        return;
      }

      toast.success("Inscripcion realizada exitosamente.");
      setIsDialogOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error(
        ERROR_MESSAGES["system.internal_error"] ??
          "Ocurrio un error inesperado. Intenta de nuevo mas tarde.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDialogClose(open: boolean): void {
    if (!open) {
      reset();
    }
    setIsDialogOpen(open);
  }

  return (
    <>
      {hasOpenCall ? (
        <Button
          onClick={() => { void handleEnrollClick(); }}
          className="min-h-[44px] bg-[var(--color-primary)] text-white transition-transform duration-200 hover:scale-[1.01] hover:bg-[var(--color-primary-hover)] active:scale-[0.99]"
          data-testid="enroll-button"
        >
          Inscribirse
        </Button>
      ) : (
        <span
          className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--color-border)] px-4 py-2 font-secondary text-sm text-[var(--color-text-secondary)]"
          data-testid="enroll-closed-badge"
        >
          Convocatoria cerrada
        </span>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent
          className="sm:max-w-md"
          data-testid="enroll-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Confirmar inscripcion
            </DialogTitle>
            <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
              Ingresa la fecha de pago para completar tu inscripcion. El monto
              sera debitado de tu cartera.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
            noValidate
            className="flex flex-col gap-4 pt-2"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-date">Fecha de pago</Label>
              <Input
                id="payment-date"
                type="date"
                disabled={isSubmitting}
                className="h-[44px]"
                data-testid="payment-date-input"
                {...register("paymentDate")}
              />
              {errors.paymentDate !== undefined && (
                <p
                  className="font-secondary text-xs text-[var(--color-error)]"
                  role="alert"
                >
                  {errors.paymentDate.message}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => { handleDialogClose(false); }}
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                data-testid="confirm-enroll-button"
              >
                {isSubmitting ? "Procesando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
