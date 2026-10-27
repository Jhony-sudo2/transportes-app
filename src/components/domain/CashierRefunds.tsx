"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCustomerData } from "@/hooks/useCustomerData";
import { RefundBranchSchema, parseInvoiceId } from "@/lib/validators/refunds";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { CustomerDataState } from "./CustomerDataState";
import { RefundInvoice } from "./RefundInvoice";

export function CashierRefunds() {
  const branch = useCustomerData("/api/cashier/context", RefundBranchSchema);
  const { busy } = useBranchWorkspace();
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  return (
    <div className="space-y-7">
      <CustomerDataState loading={branch.loading} error={branch.error} retry={branch.refresh} />
      {branch.data && (
        <>
          <p className="rounded-xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-4 text-sm">
            Atiendes en <strong>{branch.data.branchName}</strong>. Las facturas deben corresponder a
            esta sucursal.
          </p>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              const parsed = parseInvoiceId(input.trim());
              if (!parsed?.success) {
                setError("Ingresa un número de factura válido.");
                setSelected(null);
                return;
              }
              setError("");
              setSelected(parsed.data);
              setRevision((value) => value + 1);
            }}
          >
            <label htmlFor="refund-invoice-number" className="block text-sm font-semibold">
              Número de factura
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                id="refund-invoice-number"
                inputMode="numeric"
                value={input}
                disabled={busy}
                onChange={(event) => setInput(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "refund-search-error" : undefined}
                className="min-w-0 rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-4 py-3 text-sm"
              />
              <Button type="submit" disabled={busy}>
                Buscar factura
              </Button>
            </div>
            {error && (
              <p
                id="refund-search-error"
                role="alert"
                className="text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            )}
          </form>
          {selected !== null && (
            <RefundInvoice
              key={selected + ":" + revision}
              actor="cashier"
              invoiceId={selected}
              expectedBranch={branch.data.branchId}
            />
          )}
        </>
      )}
    </div>
  );
}
