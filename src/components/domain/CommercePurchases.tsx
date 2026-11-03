"use client";
import Link from "next/link";
import { CommerceInvoiceSchema } from "@/lib/validators/commerce";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CustomerDataState } from "./CustomerDataState";
import { Button } from "@/components/ui/button";
const listSchema = CommerceInvoiceSchema.array();
export function CommercePurchases() {
  const invoices = useCustomerData("/api/commerce/invoices/mine", listSchema);
  return (
    <div className="space-y-5">
      <Button variant="outline" disabled={invoices.loading} onClick={invoices.refresh}>
        Actualizar compras
      </Button>
      <CustomerDataState
        loading={invoices.loading}
        error={invoices.error}
        retry={invoices.refresh}
      />
      {invoices.data?.length === 0 && <p>Todavía no tienes compras registradas.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {invoices.data?.map((i) => (
          <article
            key={i.invoiceId}
            className="space-y-3 rounded-2xl border border-[var(--tg-line)] p-5"
          >
            <h2 className="text-xl font-semibold">Factura #{i.invoiceId}</h2>
            <p>
              {i.paymentDate}
              {i.typeInvoice && ` · ${i.typeInvoice === "TICKET_PAYMENT" ? "Boletos" : "Alquiler"}`}
            </p>
            <p>
              Q{i.totalAmount.toFixed(2)}
              {i.state && ` · ${i.state === "PAID" ? "Pagada" : "Cancelada"}`}
            </p>
            <p>NIT: {i.customerNit}</p>
            <Link
              className="underline text-[var(--tg-green)]"
              href={`/customer/purchases/${i.invoiceId}`}
            >
              Ver factura y boletos
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
