"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CustomerInvoicesSchema, type CustomerInvoice } from "@/lib/validators/customer-commerce";
import { invoiceTypeLabels, invoiceStateLabels } from "@/lib/customer-commerce-ui";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { CustomerDataState } from "./CustomerDataState";
import { CustomerRecordsTable } from "./CustomerRecordsTable";
import type { Column } from "./ReportTable";
const columns: Column<CustomerInvoice>[] = [
  {
    key: "id",
    header: "Factura",
    render: (_value, item) => (
      <Link
        href={"/customer/purchases/" + item.id}
        className="whitespace-nowrap font-semibold text-[var(--tg-green)] underline underline-offset-4"
      >
        {"Factura #" + item.id}
      </Link>
    ),
  },
  {
    key: "paymentDate",
    header: "Fecha",
    render: (_value, item) => formatDateTime(item.paymentDate),
  },
  {
    key: "typeInvoice",
    header: "Compra",
    render: (_value, item) => invoiceTypeLabels[item.typeInvoice] ?? item.typeInvoice,
  },
  {
    key: "totalAmount",
    header: "Total",
    render: (_value, item) => (
      <span className="whitespace-nowrap font-semibold">{formatCurrency(item.totalAmount)}</span>
    ),
  },
  {
    key: "state",
    header: "Estado",
    render: (_value, item) => (
      <span className="inline-block whitespace-nowrap rounded-full border border-[var(--tg-line)] px-3 py-1 text-xs">
        {invoiceStateLabels[item.state] ?? item.state}
      </span>
    ),
  },
];
export function CustomerPurchases() {
  const resource = useCustomerData("/api/customer/purchases", CustomerInvoicesSchema);
  return (
    <div className="min-w-0 space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" disabled={resource.loading} onClick={resource.refresh}>
          Actualizar compras
        </Button>
      </div>
      <CustomerDataState
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      />
      {resource.data && (
        <CustomerRecordsTable
          items={resource.data}
          columns={columns}
          caption="Mis facturas"
          emptyMessage="Todavía no tienes compras registradas."
        />
      )}
    </div>
  );
}
