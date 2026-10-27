"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { readCustomerResponse } from "@/hooks/useCustomerData";
import type { CustomerInvoice, CustomerTicket } from "@/lib/validators/customer-commerce";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

export function CustomerTicketCancellation({
  invoice,
  tickets,
  refresh,
  onSuccess,
}: {
  invoice: CustomerInvoice;
  tickets: CustomerTicket[];
  refresh: () => void;
  onSuccess: (message: string) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [scope, setScope] = useState<"invoice" | "tickets" | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [completed, setCompleted] = useState(false);
  const active = useRef(false);
  const canCancel = invoice.state === "PAID" && invoice.typeInvoice === "TICKET_PAYMENT";
  const eligible = canCancel ? tickets.filter((ticket) => ticket.state === "PAID") : [];
  const chosen =
    scope === "invoice" ? eligible : eligible.filter((ticket) => selected.includes(ticket.id));
  const amount = chosen.reduce((total, ticket) => total + ticket.amount, 0);
  const estimatedRefund = Math.round((amount / 2 + Number.EPSILON) * 100) / 100;
  function close(open: boolean) {
    if (active.current || open) return;
    setScope(null);
    if (error || uncertain) refresh();
  }
  async function confirm() {
    if (active.current || uncertain || completed || !scope || !chosen.length) return;
    active.current = true;
    setWorking(true);
    setError("");
    let ambiguous = true;
    try {
      const response = await fetch(`/api/customer/purchases/${invoice.id}/cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          scope === "invoice" ? { scope } : { scope, tickets: chosen.map((ticket) => ticket.id) },
        ),
      });
      ambiguous = response.ok || response.status >= 500;
      if (response.status !== 204) {
        await readCustomerResponse(response);
        throw new Error("No se pudo confirmar la cancelación.");
      }
      setCompleted(true);
      setScope(null);
      onSuccess(
        "Cancelación registrada. El 50 % del importe de los tickets cancelados se abonó a tu billetera. Puedes consultar el abono en tus movimientos.",
      );
    } catch (cause) {
      setUncertain(ambiguous);
      setError(
        (cause instanceof Error ? cause.message : "No se pudo cancelar la compra.") +
          (ambiguous
            ? " La operación podría haberse registrado. Revisa tus tickets y movimientos antes de volver a intentarlo."
            : ""),
      );
    } finally {
      active.current = false;
      setWorking(false);
    }
  }
  return (
    <section className="space-y-5" aria-label="Tickets de la factura">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Tickets asociados <span className="text-[var(--tg-muted)]">({tickets.length})</span>
        </h2>
        <Button variant="outline" disabled={working || scope !== null} onClick={refresh}>
          Actualizar tickets
        </Button>
      </div>
      {!tickets.length ? (
        <p className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 text-sm text-[var(--tg-muted)]">
          {invoice.typeInvoice === "RENTAL_PAYMENT"
            ? "Esta factura corresponde a un alquiler y no contiene tickets."
            : "Esta factura no tiene tickets asociados."}
        </p>
      ) : (
        <>
          {eligible.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6">
              <div>
                <h3 className="font-semibold">Cancelar mis tickets</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--tg-muted)]">
                  Puedes cancelar uno, varios o todos los tickets vigentes. Recibirás el 50 % de su
                  importe en tu billetera; el otro 50 % no se devuelve. La cancelación es
                  definitiva.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!selected.length || working || completed}
                  onClick={() => setScope("tickets")}
                >
                  Cancelar seleccionados ({selected.length})
                </Button>
                <Button
                  variant="outline"
                  disabled={working || completed || tickets.some((ticket) => !ticket.state)}
                  onClick={() => setScope("invoice")}
                >
                  Cancelar todos los vigentes
                </Button>
              </div>
            </div>
          )}
          {canCancel && tickets.some((ticket) => !ticket.state) && (
            <p role="status" className="text-sm text-[var(--tg-muted)]">
              No se puede cancelar un ticket cuyo estado no está disponible. Actualiza los datos
              para consultar su vigencia.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {tickets.map((ticket) => (
              <article
                key={ticket.id}
                className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6"
                aria-label={"Ticket #" + ticket.id}
              >
                <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--tg-line)] pb-4">
                  <h3 className="flex items-center gap-3 font-semibold">
                    <Ticket size={21} className="text-[var(--tg-green)]" aria-hidden="true" />
                    Ticket #{ticket.id}
                  </h3>
                  <p className="font-semibold">{formatCurrency(ticket.amount)}</p>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <dt className="text-[var(--tg-muted)]">Fila</dt>
                    <dd className="mt-1 text-xl font-semibold">{ticket.position.row}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--tg-muted)]">Columna</dt>
                    <dd className="mt-1 text-xl font-semibold">{ticket.position.column}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[var(--tg-muted)]">Fecha de compra</dt>
                    <dd className="mt-2">{formatDateTime(ticket.paymentDate)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[var(--tg-muted)]">Estado</dt>
                    <dd className="mt-2 font-medium">
                      {ticket.state === "PAID"
                        ? "Vigente"
                        : ticket.state === "CANCELLED"
                          ? "Cancelado"
                          : ticket.state === "REFUND"
                            ? "Devolución disponible"
                            : ticket.state === "REIMBURSED"
                              ? "Reembolsado"
                              : ticket.state || "No disponible"}
                    </dd>
                  </div>
                </dl>
                {canCancel && ticket.state === "PAID" && (
                  <label className="mt-5 flex cursor-pointer items-center gap-3 border-t border-[var(--tg-line)] pt-4 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--tg-green)]"
                      disabled={working || scope !== null || completed}
                      checked={selected.includes(ticket.id)}
                      onChange={(event) =>
                        setSelected((ids) =>
                          event.target.checked
                            ? [...ids, ticket.id]
                            : ids.filter((id) => id !== ticket.id),
                        )
                      }
                    />
                    Seleccionar ticket #{ticket.id}
                  </label>
                )}
              </article>
            ))}
          </div>
          <Link
            href="/customer/wallet"
            className="inline-block text-sm text-[var(--tg-green)] underline underline-offset-4"
          >
            Ver mi billetera y movimientos
          </Link>
        </>
      )}
      <Dialog open={scope !== null} onOpenChange={close}>
        <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
          <DialogHeader>
            <DialogTitle>
              {scope === "invoice"
                ? "Cancelar todos los tickets vigentes"
                : "Cancelar tickets seleccionados"}
            </DialogTitle>
            <DialogDescription className="text-[var(--tg-muted)]">
              Factura #{invoice.id}. Se cancelarán {chosen.length} ticket(s). Esta acción es
              definitiva y el reembolso se abonará a tu billetera.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 rounded-xl border border-[var(--tg-line)] p-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Importe a cancelar</dt>
              <dd>{formatCurrency(amount)}</dd>
            </div>
            <div className="flex justify-between gap-3 font-semibold">
              <dt>Reembolso estimado (50 %)</dt>
              <dd>{formatCurrency(estimatedRefund)}</dd>
            </div>
          </dl>
          <p className="text-sm text-[var(--tg-muted)]">
            El abono final se calcula sobre los tickets vigentes al confirmar. El 50 % restante no
            se devuelve.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <DialogFooter className="gap-3">
            <Button variant="outline" disabled={working} onClick={() => close(false)}>
              Volver
            </Button>
            {error || uncertain ? (
              <Button onClick={() => close(false)}>Actualizar tickets</Button>
            ) : (
              <Button disabled={working || completed} onClick={() => void confirm()}>
                {working ? "Cancelando…" : "Confirmar cancelación"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
