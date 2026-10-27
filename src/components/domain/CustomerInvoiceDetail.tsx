"use client";
import Link from "next/link";
import { ArrowLeft, Ticket } from "lucide-react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CustomerInvoiceDetailSchema } from "@/lib/validators/customer-commerce";
import { invoiceTypeLabels, invoiceStateLabels } from "@/lib/customer-commerce-ui";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { CustomerDataState } from "./CustomerDataState";

export function CustomerInvoiceDetail({ invoiceId }: { invoiceId: number }) {
  const resource = useCustomerData(
    "/api/customer/purchases/" + invoiceId,
    CustomerInvoiceDetailSchema,
  );
  const invoice = resource.data?.invoice;
  return (
    <section className="mx-auto max-w-6xl space-y-7 px-5 py-10 md:px-8 md:py-12">
      <Link
        href="/customer/purchases"
        className="inline-flex items-center gap-2 text-sm text-[var(--tg-green)] underline underline-offset-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a mis compras
      </Link>
      <div>
        <p className="tg-eyebrow">MIS COMPRAS / FACTURA</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Factura #{invoiceId}
        </h1>
      </div>
      <CustomerDataState
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      />
      {invoice && resource.data && (
        <>
          {["CANCELLED", "REIMBURSED"].includes(invoice.state) && (
            <Link
              href={"/customer/refunds/" + invoice.id}
              className="inline-block rounded-xl border border-[var(--tg-line)] bg-[var(--tg-paper)] px-5 py-4 text-sm font-semibold text-[var(--tg-green)] underline underline-offset-4"
            >
              {invoice.state === "CANCELLED"
                ? "Ver opciones de devolución"
                : "Consultar devolución"}
            </Link>
          )}
          <section
            aria-label="Detalle de la factura"
            className="rounded-3xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 md:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--tg-line)] pb-6">
              <div>
                <p className="text-sm text-[var(--tg-muted)]">Total de la compra</p>
                <p className="mt-2 text-3xl font-semibold">{formatCurrency(invoice.totalAmount)}</p>
              </div>
              <span className="rounded-full border border-[var(--tg-line)] px-4 py-2 text-sm font-semibold">
                {invoiceStateLabels[invoice.state] ?? invoice.state}
              </span>
            </div>
            <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Fecha", formatDateTime(invoice.paymentDate)],
                ["Tipo de compra", invoiceTypeLabels[invoice.typeInvoice] ?? invoice.typeInvoice],
                [
                  "Canal",
                  invoice.chanel === "WEB"
                    ? "En línea"
                    : invoice.chanel === "COUNTER"
                      ? "Ventanilla"
                      : invoice.chanel || "—",
                ],
                ["NIT de facturación", invoice.customerNit || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[var(--tg-muted)]">{label}</dt>
                  <dd className="mt-2 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="space-y-5" aria-label="Tickets de la factura">
            <h2 className="text-xl font-semibold">
              Tickets asociados{" "}
              <span className="text-[var(--tg-muted)]">({resource.data.tickets.length})</span>
            </h2>
            {!resource.data.tickets.length ? (
              <p className="rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6 text-sm text-[var(--tg-muted)]">
                {invoice.typeInvoice === "RENTAL_PAYMENT"
                  ? "Esta factura corresponde a un alquiler y no contiene tickets."
                  : "Esta factura no tiene tickets asociados."}
              </p>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {resource.data.tickets.map((ticket) => (
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
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
