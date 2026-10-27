"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CustomerInvoiceDetailSchema } from "@/lib/validators/customer-commerce";
import { invoiceTypeLabels, invoiceStateLabels } from "@/lib/customer-commerce-ui";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { CustomerDataState } from "./CustomerDataState";
import { CustomerTicketCancellation } from "./CustomerTicketCancellation";

export function CustomerInvoiceDetail({ invoiceId }: { invoiceId: number }) {
  const resource = useCustomerData(
    "/api/customer/purchases/" + invoiceId,
    CustomerInvoiceDetailSchema,
  );
  const invoice = resource.data?.invoice;
  const [notice, setNotice] = useState("");
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
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm"
        >
          {notice}
        </p>
      )}
      {invoice && resource.data && (
        <>
          {(invoice.state === "REIMBURSED" ||
            (invoice.state === "REFUND" && invoice.totalAmount > 0)) && (
            <Link
              href={"/customer/refunds/" + invoice.id}
              className="inline-block rounded-xl border border-[var(--tg-line)] bg-[var(--tg-paper)] px-5 py-4 text-sm font-semibold text-[var(--tg-green)] underline underline-offset-4"
            >
              {invoice.state === "REFUND" ? "Ver opciones de devolución" : "Consultar devolución"}
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
                ["Devuelto por cancelación propia", formatCurrency(invoice.refundedAmount ?? 0)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[var(--tg-muted)]">{label}</dt>
                  <dd className="mt-2 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {(invoice.refundedAmount ?? 0) > 0 && (
              <p className="mt-5 text-sm text-[var(--tg-muted)]">
                El importe devuelto por cancelación propia es el acumulado que ya se abonó a tu
                billetera.
              </p>
            )}
          </section>
          <CustomerTicketCancellation
            invoice={invoice}
            tickets={resource.data.tickets}
            refresh={resource.refresh}
            onSuccess={(message) => {
              setNotice(message);
              resource.refresh();
            }}
          />
        </>
      )}
    </section>
  );
}
