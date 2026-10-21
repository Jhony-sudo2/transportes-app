import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import type { Wallet } from "@/types/wallet";

interface WalletPanelProps {
  wallet: Wallet | null;
  onTopUp?: () => void;
}

export function WalletPanel({ wallet, onTopUp }: WalletPanelProps): React.ReactElement {
  const balance = wallet !== null ? wallet.balance : 0;
  const hasBalance = balance > 0;

  return (
    <Card
      className="overflow-hidden border-[var(--color-border)] transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
      data-testid="wallet-panel"
    >
      {/*
       * The accent bar uses the primary token which is always a dark-enough blue
       * (#0b57d0 light / #1a73e8 dark) — both have >4.5:1 against white text.
       */}
      <div className="bg-[var(--color-primary)] px-6 py-5">
        <p className="font-secondary text-xs font-medium uppercase tracking-wider text-white/80">
          Saldo disponible
        </p>
        <p
          className="mt-1 font-sans text-3xl font-medium text-white"
          data-testid="wallet-balance"
        >
          {formatCurrency(balance)}
        </p>
        {hasBalance && (
          <div className="mt-2 flex items-center gap-1 text-white/70">
            <TrendingUp size={14} strokeWidth={1.5} />
            <span className="font-secondary text-xs">Saldo activo</span>
          </div>
        )}
      </div>

      <CardHeader className="pb-0">
        <CardTitle className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
          Mi cartera
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        {onTopUp !== undefined && (
          <Button
            onClick={onTopUp}
            className="min-h-[44px] w-full transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            data-testid="wallet-top-up-button"
          >
            Recargar saldo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
