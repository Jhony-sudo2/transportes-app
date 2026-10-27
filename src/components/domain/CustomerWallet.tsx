"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Wallet, RefreshCw, Plus, History } from "lucide-react";
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
import { FleetField } from "./FleetField";
import { CustomerDataState } from "./CustomerDataState";
import { CustomerRecordsTable } from "./CustomerRecordsTable";
import { useCustomerData, readCustomerResponse } from "@/hooks/useCustomerData";
import {
  CustomerWalletOverviewSchema,
  CustomerRechargeSchema,
  CustomerTransactionSchema,
  type CustomerTransaction,
} from "@/lib/validators/customer-commerce";
import { transactionLabels } from "@/lib/customer-commerce-ui";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Column } from "./ReportTable";

const columns: Column<CustomerTransaction>[] = [
  { key: "createdAt", header: "Fecha", render: (_value, item) => formatDateTime(item.createdAt) },
  {
    key: "transactionType",
    header: "Movimiento",
    render: (_value, item) => transactionLabels[item.transactionType],
  },
  { key: "description", header: "Descripción", render: (_value, item) => item.description || "—" },
  {
    key: "amount",
    header: "Monto",
    render: (_value, item) => (
      <span className="whitespace-nowrap font-semibold">{formatCurrency(item.amount)}</span>
    ),
  },
];
export function CustomerWallet() {
  const resource = useCustomerData("/api/customer/wallet", CustomerWalletOverviewSchema);
  const { busy, setBusy } = useBranchWorkspace();
  const active = useRef(false);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof CustomerRechargeSchema>>({
    resolver: zodResolver(CustomerRechargeSchema),
  });
  function changeOpen(next: boolean) {
    if (active.current) return;
    if (next) {
      reset();
      setError("");
      setUncertain(false);
    }
    if (!next && uncertain) resource.refresh();
    setOpen(next);
  }
  async function recharge(data: z.infer<typeof CustomerRechargeSchema>) {
    if (active.current || busy || uncertain) return;
    active.current = true;
    setWorking(true);
    setBusy(true);
    setError("");
    setNotice("");
    let ambiguous = true;
    try {
      const response = await fetch("/api/customer/wallet/recharges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      ambiguous = response.ok || response.status >= 500;
      const body = await readCustomerResponse(response);
      const parsed = CustomerTransactionSchema.safeParse(
        body && typeof body === "object" && "transaction" in body ? body.transaction : null,
      );
      if (
        !parsed.success ||
        parsed.data.transactionType !== "USER_RECHARGE" ||
        parsed.data.amount !== data.amount
      )
        throw new Error("La respuesta no confirma la recarga solicitada.");
      setNotice("Recarga de " + formatCurrency(parsed.data.amount) + " registrada correctamente.");
      setOpen(false);
      reset();
      resource.refresh();
    } catch (cause) {
      setUncertain(ambiguous);
      const message = cause instanceof Error ? cause.message : "No se pudo confirmar la recarga.";
      setError(
        message +
          (ambiguous && !message.includes("Revisa tu saldo")
            ? " Revisa tu saldo y movimientos antes de volver a enviarla."
            : ""),
      );
    } finally {
      active.current = false;
      setWorking(false);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8">
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm"
        >
          {notice}
        </p>
      )}
      <CustomerDataState
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      />
      {resource.data && (
        <>
          <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section
              className="rounded-3xl bg-[#16383e] p-7 text-[#eef6ed] md:p-9"
              aria-label="Saldo de mi billetera"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c3d6c9]">
                  SALDO DISPONIBLE
                </p>
                <Wallet size={26} aria-hidden="true" />
              </div>
              <p
                className="my-6 break-words text-4xl font-semibold tracking-tight md:text-5xl"
                data-testid="customer-wallet-balance"
              >
                {formatCurrency(resource.data.wallet.amount)}
              </p>
              <p className="text-sm leading-6 text-[#c3d6c9]">
                Tu billetera de Transportes Guatemala.
              </p>
            </section>
            <section className="flex flex-col justify-between gap-6 rounded-3xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-7">
              <div>
                <h2 className="text-xl font-semibold">Prepara tu próxima compra</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--tg-muted)]">
                  Agrega saldo y consulta aquí cada movimiento de tu billetera.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy || resource.loading} onClick={() => changeOpen(true)}>
                  <Plus size={17} aria-hidden="true" />
                  Recargar saldo
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || resource.loading}
                  onClick={resource.refresh}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Actualizar
                </Button>
              </div>
            </section>
          </div>
          <section className="min-w-0 space-y-5">
            <h2 className="flex items-center gap-3 text-xl font-semibold">
              <History size={21} aria-hidden="true" />
              Mis movimientos
            </h2>
            <CustomerRecordsTable
              items={resource.data.transactions}
              columns={columns}
              caption="Movimientos de mi billetera"
              emptyMessage="Tu billetera todavía no tiene movimientos."
            />
          </section>
        </>
      )}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="transport-dialog max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[var(--tg-line)] bg-[var(--tg-paper)] text-[var(--tg-ink)]">
          <DialogHeader>
            <DialogTitle>Recargar mi billetera</DialogTitle>
            <DialogDescription className="text-[var(--tg-muted)]">
              Ingresa el monto en quetzales. La recarga se registrará con la fecha y hora actuales.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(event) => void handleSubmit(recharge)(event)}
            className="space-y-5"
          >
            <FleetField
              id="customer-recharge-amount"
              label="Monto de la recarga (Q)"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              disabled={working || uncertain}
              error={errors.amount}
              {...register("amount", { valueAsNumber: true })}
            />
            {error && (
              <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={working}
                onClick={() => changeOpen(false)}
              >
                Cerrar
              </Button>
              {uncertain ? (
                <Button type="button" onClick={() => changeOpen(false)}>
                  Revisar movimientos
                </Button>
              ) : (
                <Button type="submit" disabled={working}>
                  {working ? "Registrando…" : "Confirmar recarga"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
