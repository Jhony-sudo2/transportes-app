"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import type { BusListRecord } from "@/lib/validators/fleet-resources";
import type { FleetRecordsActions } from "./FleetRecordsList";
import { CreateBusForm } from "./CreateBusForm";
export function BusEditDialog({
  bus,
  branch,
  actions,
}: {
  bus: BusListRecord;
  branch: { id: number; name: string };
  actions: FleetRecordsActions<BusListRecord>;
}) {
  const [open, setOpen] = useState(false);
  const { busy } = useBranchWorkspace();
  function close(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) actions.refresh();
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          aria-label={`Editar bus ${bus.plateNumber}`}
        >
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
        <DialogHeader>
          <DialogTitle>Editar bus {bus.plateNumber}</DialogTitle>
          <DialogDescription className="text-[var(--tg-muted)]">
            Sucursal: {branch.name}. Puedes actualizar los datos del bus y reemplazar su fotografía.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CreateBusForm
            branch={branch}
            bus={bus}
            onCancel={() => close(false)}
            onSaved={(item) => {
              actions.update(item);
              actions.notify(`Bus ${item.plateNumber} actualizado.`);
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
