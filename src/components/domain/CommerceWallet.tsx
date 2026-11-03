"use client";
import { useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import {
  WalletOverviewSchema,
  RechargeInputSchema,
  WalletRechargeSchema,
} from "@/lib/validators/commerce";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { formatCurrency } from "@/lib/utils/format";
import { transactionLabels } from "@/lib/customer-commerce-ui";
import { guatemalaDate } from "@/lib/transport-time";
export function CommerceWallet({ userId }: { userId: number }) {
  const data = useCustomerData("/api/commerce/wallet", WalletOverviewSchema),
    [notice, setNotice] = useState("");
  return (
    <div className="space-y-6">
      <CustomerDataState loading={data.loading} error={data.error} retry={data.refresh} />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {data.data && (
        <>
          <section className="rounded-3xl bg-[#16383e] p-7 text-white">
            <p>Saldo disponible</p>
            <p className="my-4 text-4xl font-semibold" data-testid="customer-wallet-balance">
              {formatCurrency(data.data.wallet.balance)}
            </p>
            <p>
              {data.data.wallet.active
                ? "Billetera activa"
                : "Billetera inactiva: consulta con administración."}
            </p>
          </section>
          {data.data.wallet.active && (
            <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-6">
              <h2 className="text-xl font-semibold">Recarga manual</h2>
              <OperationForm
                scope={`wallet:${userId}`}
                path="/api/commerce/wallet/recharges"
                fields={[
                  {
                    name: "amount",
                    label: "Monto de la recarga (Q)",
                    type: "number",
                    min: 0.01,
                    step: "0.01",
                  },
                  {
                    name: "paymentDate",
                    label: "Fecha de la recarga",
                    type: "date",
                    value: guatemalaDate(),
                  },
                ]}
                schema={RechargeInputSchema}
                resultSchema={WalletRechargeSchema}
                label="Confirmar recarga"
                onSaved={(r) => {
                  setNotice(
                    `Recarga registrada. Saldo confirmado: ${formatCurrency(r.balanceAfter)}.`,
                  );
                  data.refresh();
                }}
              />
            </section>
          )}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Mis movimientos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th>Movimiento</th>
                    <th>Importe</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.transactions.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--tg-line)]">
                      <td className="p-3">{t.createdAt}</td>
                      <td>{transactionLabels[t.transactionType]}</td>
                      <td>{formatCurrency(t.amount)}</td>
                      <td>{t.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.data.transactions.length && <p>Tu billetera todavía no tiene movimientos.</p>}
          </section>
        </>
      )}
    </div>
  );
}
