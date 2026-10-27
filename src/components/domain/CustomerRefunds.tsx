"use client";
import { useState } from "react";
import Link from "next/link";
import { useCustomerData } from "@/hooks/useCustomerData";
import { RefundListSchema } from "@/lib/validators/refunds";
import type { CustomerInvoice } from "@/lib/validators/customer-commerce";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { CustomerDataState } from "./CustomerDataState";
import { CustomerRecordsTable } from "./CustomerRecordsTable";
import type { Column } from "./ReportTable";

const columns: Column<CustomerInvoice>[] = [
  {
    key: "id",
    header: "Factura",
    render: (_v, item) => (
      <Link
        href={"/customer/refunds/" + item.id}
        className="font-semibold text-[var(--tg-green)] underline underline-offset-4"
      >
        Ver factura #{item.id}
      </Link>
    ),
  },
  {
    key: "paymentDate",
    header: "Fecha de compra",
    render: (_v, item) => formatDateTime(item.paymentDate),
  },
  { key: "branchId", header: "Sucursal", render: (_v, item) => "Sucursal #" + item.branchId },
  {
    key: "totalAmount",
    header: "Importe",
    render: (_v, item) => formatCurrency(item.totalAmount),
  },
];
export function CustomerRefunds() {
  const resource = useCustomerData("/api/customer/refunds", RefundListSchema);
  const [state, setState] = useState("CANCELLED");
  const available = state === "CANCELLED";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3" aria-label="Filtrar devoluciones">
        <Button
          variant={available ? "default" : "outline"}
          aria-pressed={available}
          onClick={() => setState("CANCELLED")}
        >
          Disponibles
        </Button>
        <Button
          variant={!available ? "default" : "outline"}
          aria-pressed={!available}
          onClick={() => setState("REIMBURSED")}
        >
          Reembolsadas
        </Button>
        <Button variant="outline" disabled={resource.loading} onClick={resource.refresh}>
          Actualizar
        </Button>
      </div>
      <CustomerDataState
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      />
      {resource.data && (
        <CustomerRecordsTable
          key={state}
          items={resource.data.filter((invoice) => invoice.state === state)}
          columns={columns}
          caption={available ? "Devoluciones disponibles" : "Facturas reembolsadas"}
          emptyMessage={
            available
              ? "No tienes devoluciones disponibles por viajes cancelados."
              : "Todavía no tienes facturas reembolsadas."
          }
        />
      )}
    </div>
  );
}
