"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TrendingUp, TrendingDown, History } from "lucide-react";
import { WalletPanel } from "@/components/domain/WalletPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { TopUpSchema, type TopUpData, type WalletBalanceData, type TransactionListData } from "@/lib/validators/wallet";
import { ProblemDetailSchema } from "@/lib/validators/error";
import { ERROR_MESSAGES } from "@/lib/utils/error-messages";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Wallet } from "@/types/wallet";

interface WalletPageClientProps {
  wallet: WalletBalanceData;
  transactions: TransactionListData;
}

export function WalletPageClient({ wallet, transactions }: WalletPageClientProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const walletForPanel: Wallet = {
    userId: wallet.userId,
    balance: wallet.balance,
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TopUpData>({
    resolver: zodResolver(TopUpSchema),
  });

  function openDialog(): void {
    reset();
    setDialogOpen(true);
  }

  async function onSubmit(data: TopUpData): Promise<void> {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/wallet/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body: unknown = await response.json();
        const errorParsed = ProblemDetailSchema.safeParse(body);
        const code = errorParsed.success ? errorParsed.data.code : "system.internal_error";
        const message =
          ERROR_MESSAGES[code] ?? ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.";
        toast.error(message);
        return;
      }

      toast.success("Recarga realizada correctamente.");
      setDialogOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error(ERROR_MESSAGES["system.internal_error"] ?? "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="wallet-page">
      {/* Wallet panel */}
      <div className="mx-auto w-full max-w-sm">
        <WalletPanel wallet={walletForPanel} onTopUp={openDialog} />
      </div>

      {/* Transactions section */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-pale-blue)] text-[var(--color-primary-text)]">
            <History size={16} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
            Historial de transacciones
          </h2>
        </div>

        {transactions.items.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-8 text-center">
            <p className="font-secondary text-sm text-[var(--color-text-secondary)]">
              No hay transacciones registradas aun.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <table
              className="w-full min-w-[540px] border-collapse font-secondary text-sm"
              data-testid="wallet-transactions-table"
            >
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left">
                  <th className="px-4 py-3 font-medium text-[var(--color-text-primary)]">Fecha</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-primary)]">Tipo</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-primary)]">Monto</th>
                  <th className="px-4 py-3 font-medium text-[var(--color-text-primary)]">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {transactions.items.map((tx, index) => {
                  const isTopUp = tx.type === "TOP_UP";
                  return (
                    <tr
                      key={tx.id}
                      className="animate-fade-in-up border-t border-[var(--color-border)] bg-[var(--color-white)] transition-colors hover:bg-[var(--color-surface)]"
                      style={index > 0 ? { animationDelay: `${Math.min(index * 75, 450)}ms` } : undefined}
                    >
                      <td className="px-4 py-3 text-[var(--color-text-primary)]">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isTopUp
                              ? "inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-green-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent-green-text)]"
                              : "inline-flex items-center gap-1 rounded-full bg-[var(--color-error)] px-2.5 py-0.5 text-xs font-medium text-white"
                          }
                        >
                          {isTopUp ? (
                            <TrendingUp size={11} strokeWidth={1.5} aria-hidden="true" />
                          ) : (
                            <TrendingDown size={11} strokeWidth={1.5} aria-hidden="true" />
                          )}
                          {isTopUp ? "Recarga" : "Pago"}
                        </span>
                      </td>
                      <td
                        className={
                          isTopUp
                            ? "px-4 py-3 font-medium text-[var(--color-accent-green-text)]"
                            : "px-4 py-3 font-medium text-[var(--color-error)]"
                        }
                      >
                        {isTopUp ? "+" : ""}
                        {formatCurrency(Math.abs(tx.amount))}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">
                        {tx.referencePaymentId !== null
                          ? tx.referencePaymentId.slice(0, 8)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top-up dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="border-[var(--color-border)] bg-[var(--color-white)] sm:max-w-[400px]"
          data-testid="top-up-dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium text-[var(--color-text-primary-black)]">
              Recargar saldo
            </DialogTitle>
            <DialogDescription className="font-secondary text-sm text-[var(--color-text-secondary)]">
              Ingresa el monto y la fecha de recarga.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            noValidate
            className="flex flex-col gap-4 py-2"
          >
            {/* Amount */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="topup-amount"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Monto (Q)
              </Label>
              <Input
                id="topup-amount"
                type="number"
                step="0.01"
                min="0.01"
                disabled={isSubmitting}
                data-testid="top-up-amount-input"
                aria-invalid={errors.amount !== undefined}
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Payment date */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="topup-date"
                className="font-secondary text-sm text-[var(--color-text-primary)]"
              >
                Fecha de recarga
              </Label>
              <Input
                id="topup-date"
                type="date"
                disabled={isSubmitting}
                data-testid="top-up-date-input"
                aria-invalid={errors.paymentDate !== undefined}
                {...register("paymentDate")}
              />
              {errors.paymentDate !== undefined && (
                <p className="font-secondary text-xs text-[var(--color-error)]" role="alert">
                  {errors.paymentDate.message}
                </p>
              )}
            </div>

            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setDialogOpen(false)}
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                data-testid="top-up-confirm-button"
              >
                {isSubmitting ? "Recargando..." : "Confirmar recarga"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
