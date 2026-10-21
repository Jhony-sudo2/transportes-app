"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface DeleteInstitutionDialogProps {
  institutionId: string;
  institutionName: string;
  onSuccess: () => void;
}

export function DeleteInstitutionDialog({
  institutionId,
  institutionName,
  onSuccess,
}: DeleteInstitutionDialogProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/institutions/${institutionId}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      onSuccess();
    } else {
      const body: unknown = await res.json();
      const parsed = ProblemDetailSchema.safeParse(body);
      setError(
        parsed.success ? parsed.data.detail : "No se puede eliminar la institucion. Puede que tenga congresos asociados.",
      );
    }
  };

  return (
    <>
      <Button
        data-testid="delete-institution-button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); }}
        className="min-h-[44px] border-[var(--color-border)] text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        Eliminar
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) setOpen(false); }}>
        <DialogContent className="bg-[var(--color-white)]">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Eliminar institucion
            </DialogTitle>
            <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
              Esta accion no se puede deshacer. Se eliminara permanentemente la
              institucion <span className="font-medium text-[var(--color-text-primary-black)]">{institutionName}</span>.
            </DialogDescription>
          </DialogHeader>
          {error !== null && (
            <p className="font-secondary text-xs text-[var(--color-error)]">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              data-testid="delete-institution-confirm"
              disabled={loading}
              onClick={() => { void handleDelete(); }}
              className="min-h-[44px] bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90"
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
