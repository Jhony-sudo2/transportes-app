"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";

interface DeleteCongressDialogProps {
  congressId: string;
  congressName: string;
  onSuccess: () => void;
}

export function DeleteCongressDialog({
  congressId,
  congressName,
  onSuccess,
}: DeleteCongressDialogProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm(): Promise<void> {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/congresses/${congressId}`, {
        method: "DELETE",
      });

      if (response.status === 204 || response.ok) {
        toast.success("Congreso eliminado correctamente.");
        setDialogOpen(false);
        router.refresh();
        onSuccess();
        return;
      }

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
    } catch {
      toast.error(
        ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="min-h-[44px] border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white"
        data-testid="delete-congress-button"
        aria-label={`Eliminar congreso ${congressName}`}
      >
        <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="ml-1.5">Eliminar</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Eliminar congreso
            </DialogTitle>
            <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
              Esta accion no se puede deshacer. Se eliminara el congreso{" "}
              <span className="font-medium text-[var(--color-text-primary-black)]">
                {congressName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => setDialogOpen(false)}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading}
              onClick={() => {
                void handleConfirm();
              }}
              className="min-h-[44px] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
              data-testid="delete-congress-confirm"
            >
              {isLoading ? "Eliminando..." : "Confirmar eliminacion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
