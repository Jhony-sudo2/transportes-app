"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { useCustomerData, readCustomerResponse } from "@/hooks/useCustomerData";
import { RefundDetailSchema, type RefundDetail } from "@/lib/validators/refunds";
import { CustomerTransactionSchema, type CustomerTicket } from "@/lib/validators/customer-commerce";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { invoiceStateLabels } from "@/lib/customer-commerce-ui";
import { CustomerDataState } from "./CustomerDataState";
import { CustomerRecordsTable } from "./CustomerRecordsTable";
import type { Column } from "./ReportTable";

const ticketColumns: Column<CustomerTicket>[] = [
  { key: "id", header: "Ticket" },
  {
    key: "position",
    header: "Asiento",
    render: (_v, item) => "Fila " + item.position.row + ", columna " + item.position.column,
  },
  { key: "amount", header: "Importe", render: (_v, item) => formatCurrency(item.amount) },
];
export function RefundInvoice({
  actor,
  invoiceId,
  expectedBranch,
}: {
  actor: "customer" | "cashier";
  invoiceId: number;
  expectedBranch?: number;
}) {
  const resource = useCustomerData("/api/" + actor + "/refunds/" + invoiceId, RefundDetailSchema);
  const [notice, setNotice] = useState("");
  const detail = resource.data;
  const invalid =
    detail &&
    (detail.invoice.id !== invoiceId ||
      (expectedBranch !== undefined && detail.invoice.branchId !== expectedBranch));
  return (
    <div className="space-y-6">
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm"
        >
          {notice}
        </p>
      )}
      {actor === "customer" && (
        <Link
          href="/customer/refunds"
          className="text-sm text-[var(--tg-green)] underline underline-offset-4"
        >
          Volver a mis devoluciones
        </Link>
      )}
      <CustomerDataState
        loading={resource.loading}
        error={invalid ? "La factura no corresponde a esta consulta." : resource.error}
        retry={resource.refresh}
      />
      {detail && !invalid && (
        <RefundInvoiceContent
          key={invoiceId + ":" + detail.invoice.state}
          detail={detail}
          actor={actor}
          refresh={resource.refresh}
          onSuccess={(message) => {
            setNotice(message);
            resource.refresh();
          }}
        />
      )}
    </div>
  );
}
function RefundInvoiceContent({
  detail,
  actor,
  refresh,
  onSuccess,
}: {
  detail: RefundDetail;
  actor: "customer" | "cashier";
  refresh: () => void;
  onSuccess: (message: string) => void;
}) {
  const { invoice, branchName } = detail;
  const customer = actor === "customer";
  const available = invoice.state === "REFUND" && invoice.totalAmount > 0;
  const { busy, setBusy } = useBranchWorkspace();
  const active = useRef(false);
  const [open, setOpen] = useState(false);
  const [presencial, setPresencial] = useState(false);
  const [working, setWorking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  function close(next: boolean) {
    if (active.current) return;
    setOpen(next);
    if (!next && (uncertain || error)) refresh();
  }
  async function confirm() {
    if (active.current || busy || uncertain || completed) return;
    active.current = true;
    setWorking(true);
    setBusy(true);
    setError("");
    let ambiguous = true;
    try {
      const response = await fetch("/api/" + actor + "/refunds/" + invoice.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      ambiguous = response.ok || response.status >= 500;
      const body = await readCustomerResponse(response);
      const parsed = CustomerTransactionSchema.safeParse(
        body && typeof body === "object" && "transaction" in body ? body.transaction : null,
      );
      if (
        !parsed.success ||
        parsed.data.transactionType !== "REFUND" ||
        parsed.data.amount !== invoice.totalAmount
      )
        throw new Error("La respuesta no confirma la devolución solicitada.");
      setCompleted(true);
      setOpen(false);
      onSuccess(
        customer
          ? "Se abonaron " + formatCurrency(invoice.totalAmount) + " a tu billetera."
          : "Entrega presencial de " +
              formatCurrency(invoice.totalAmount) +
              " registrada. Movimiento #" +
              parsed.data.id +
              ".",
      );
    } catch (cause) {
      setUncertain(ambiguous);
      setError(
        (cause instanceof Error ? cause.message : "No se pudo registrar la devolución.") +
          (ambiguous
            ? " Actualiza la factura antes de volver a intentar; la devolución podría haberse registrado."
            : ""),
      );
    } finally {
      active.current = false;
      setWorking(false);
      setBusy(false);
    }
  }
  return (
    <>
      <section
        aria-label="Factura para devolución"
        className="rounded-3xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Factura #{invoice.id}</h2>
            <p className="mt-2 text-sm text-[var(--tg-muted)]">Importe de la factura</p>
            <p className="mt-2 text-3xl font-semibold">{formatCurrency(invoice.totalAmount)}</p>
          </div>
          <span className="rounded-full border border-[var(--tg-line)] px-4 py-2 text-sm">
            {completed ? "Reembolsada" : (invoiceStateLabels[invoice.state] ?? invoice.state)}
          </span>
        </div>
        <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--tg-muted)]">Devuelto por cancelación propia</dt>
            <dd className="mt-1 font-medium">{formatCurrency(invoice.refundedAmount ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-[var(--tg-muted)]">Sucursal</dt>
            <dd className="mt-1 font-medium">{branchName}</dd>
          </div>
          <div>
            <dt className="text-[var(--tg-muted)]">NIT de facturación</dt>
            <dd className="mt-1 font-medium">{invoice.customerNit || "Sin NIT registrado"}</dd>
          </div>
          <div>
            <dt className="text-[var(--tg-muted)]">Fecha de compra</dt>
            <dd className="mt-1">{formatDateTime(invoice.paymentDate)}</dd>
          </div>
          {!customer && (
            <div>
              <dt className="text-[var(--tg-muted)]">Cuenta del comprador</dt>
              <dd className="mt-1">
                {invoice.userId === null ? "Compra sin cuenta" : "Cliente registrado"}
              </dd>
            </div>
          )}
        </dl>
        {available && !completed ? (
          <div className="mt-7 space-y-4 border-t border-[var(--tg-line)] pt-6">
            <p className="text-sm leading-6 text-[var(--tg-muted)]">
              {customer
                ? "El viaje fue cancelado. Elige cómo recibir tu devolución. Solo puede cobrarse una vez."
                : "El viaje fue cancelado. Verifica la factura con el comprador y confirma la entrega del importe completo."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={busy}
                onClick={() => {
                  setError("");
                  setUncertain(false);
                  setOpen(true);
                }}
              >
                {customer ? "Recibir en mi billetera" : "Registrar entrega presencial"}
              </Button>
              {customer && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPresencial(!presencial)}
                >
                  Cobrar presencialmente
                </Button>
              )}
            </div>
            {presencial && (
              <p
                role="status"
                className="rounded-xl bg-[var(--color-surface)] p-4 text-sm leading-6"
              >
                Presenta la factura #{invoice.id} en {branchName} para cobrar{" "}
                {formatCurrency(invoice.totalAmount)}. El cajero registrará la entrega. Consultar
                estas instrucciones no registra el pago.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--tg-muted)]">
            {completed || invoice.state === "REIMBURSED"
              ? "Esta factura ya fue reembolsada y no puede cobrarse nuevamente."
              : "Esta factura no tiene una devolución disponible por cancelación."}
          </p>
        )}
        {customer && (
          <Link
            href="/customer/wallet"
            className="mt-5 inline-block text-sm text-[var(--tg-green)] underline underline-offset-4"
          >
            Ver mi billetera y movimientos
          </Link>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tickets de la factura</h2>
        <CustomerRecordsTable
          items={detail.tickets}
          columns={ticketColumns}
          caption="Tickets de la devolución"
          emptyMessage="Esta factura no tiene tickets asociados."
        />
      </section>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
          <DialogHeader>
            <DialogTitle>
              {customer ? "Confirmar devolución a billetera" : "Confirmar entrega presencial"}
            </DialogTitle>
            <DialogDescription className="text-[var(--tg-muted)]">
              Factura #{invoice.id} · {formatCurrency(invoice.totalAmount)}.{" "}
              {customer
                ? "El importe se abonará a tu billetera y ya no podrá cobrarse presencialmente."
                : "Confirma únicamente al entregar este importe al comprador. La devolución se descontará de la billetera de " +
                  branchName +
                  "."}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <DialogFooter className="gap-3">
            <Button variant="outline" disabled={working} onClick={() => close(false)}>
              Cerrar
            </Button>
            {uncertain || error ? (
              <Button onClick={() => close(false)}>Actualizar factura</Button>
            ) : (
              <Button disabled={working} onClick={() => void confirm()}>
                {working ? "Registrando…" : customer ? "Confirmar devolución" : "Confirmar entrega"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
