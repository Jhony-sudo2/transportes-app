"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
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
import { CreateProposalSchema, type CreateProposalData } from "@/lib/validators/proposal";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface SubmitProposalButtonProps {
  callId: string;
}

export function SubmitProposalButton({ callId }: SubmitProposalButtonProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProposalData>({
    resolver: zodResolver(CreateProposalSchema),
    defaultValues: { type: "PONENCIA" },
  });

  function handleOpenChange(value: boolean): void {
    if (!value) reset();
    setOpen(value);
  }

  async function onSubmit(data: CreateProposalData): Promise<void> {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/calls/${callId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body: unknown = await res.json();
        const parsed = ProblemDetailSchema.safeParse(body);
        const code = parsed.success ? parsed.data.code : "system.internal_error";
        toast.error(
          ERROR_MESSAGES[code] ??
          ERROR_MESSAGES["system.internal_error"] ??
          "Error al enviar la propuesta.",
        );
        return;
      }

      toast.success("Propuesta enviada exitosamente.");
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(ERROR_MESSAGES["system.internal_error"] ?? "Error al enviar la propuesta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => { setOpen(true); }}
        className="min-h-[44px] border-[var(--color-primary)] text-[var(--color-primary-text)] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
        data-testid="submit-proposal-button"
      >
        <FileText size={15} strokeWidth={1.5} aria-hidden="true" />
        <span className="ml-1.5">Enviar propuesta</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Enviar propuesta
            </DialogTitle>
            <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
              Completa los datos de tu propuesta para esta convocatoria.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
            noValidate
            className="flex flex-col gap-4 py-2"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="proposal-title" className="font-secondary text-sm text-[var(--color-text-primary)]">
                Titulo
              </Label>
              <Input
                id="proposal-title"
                disabled={submitting}
                aria-invalid={errors.title !== undefined}
                data-testid="proposal-title-input"
                {...register("title")}
              />
              {errors.title !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="proposal-description" className="font-secondary text-sm text-[var(--color-text-primary)]">
                Descripcion
              </Label>
              <textarea
                id="proposal-description"
                rows={3}
                disabled={submitting}
                aria-invalid={errors.description !== undefined}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-secondary text-sm text-[var(--color-text-primary-black)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("description")}
              />
              {errors.description !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="proposal-type" className="font-secondary text-sm text-[var(--color-text-primary)]">
                Tipo
              </Label>
              <select
                id="proposal-type"
                disabled={submitting}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-secondary text-sm text-[var(--color-text-primary-black)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("type")}
              >
                <option value="PONENCIA">Ponencia</option>
                <option value="TALLER">Taller</option>
              </select>
            </div>

            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => { handleOpenChange(false); }}
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)] hover:scale-[1.01] active:scale-[0.99]"
                data-testid="proposal-submit-confirm"
              >
                {submitting ? "Enviando..." : "Enviar propuesta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
