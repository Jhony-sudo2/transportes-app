"use client";
import { useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import * as V from "@/lib/validators/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { displayInstant } from "@/lib/transport-time";
const labels = {
  OPENING: "Apertura",
  TICKET_SALE: "Venta de boletos",
  RENTAL_SALE: "Venta de alquiler",
  CASH_REFUND: "Reembolso en efectivo",
  CAPITAL_IN: "Aporte de capital",
  CAPITAL_OUT: "Retiro de capital",
};
export function CashDesk({ userId, branchId }: { userId: number; branchId?: number }) {
  const query = branchId ? `?branchId=${branchId}` : "",
    context = useCustomerData(`/api/commerce/context${query}`, V.CashContextSchema),
    cash = useCustomerData(`/api/commerce/cash${query}`, V.CashAccountSchema),
    [range, setRange] = useState(""),
    [notice, setNotice] = useState("");
  const movements = useCustomerData(
    `/api/commerce/cash/movements${query}${query ? "&" : "?"}${range}`,
    V.CashHistorySchema,
  );
  const updated = () => {
    setNotice("Operación confirmada. El saldo se consulta nuevamente.");
    cash.refresh();
    movements.refresh();
  };
  return (
    <div className="space-y-6">
      <CustomerDataState
        loading={context.loading || cash.loading || movements.loading}
        error={context.error || cash.error || movements.error}
        retry={() => {
          context.refresh();
          cash.refresh();
          movements.refresh();
        }}
      />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {context.data && cash.data && (
        <>
          <section className="rounded-2xl bg-[#16383e] p-7 text-white">
            <p>Caja · {context.data.branchName}</p>
            <p className="my-3 text-4xl font-semibold">Q{cash.data.balance.toFixed(2)}</p>
            <p>
              {cash.data.initializedAt
                ? `Inicializada: ${displayInstant(cash.data.initializedAt)}`
                : "Caja no inicializada"}
            </p>
          </section>
          {context.data.canManageCapital &&
            (cash.data.initializedAt ? (
              <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5">
                <h2 className="text-xl font-semibold">Aportar o retirar capital</h2>
                <p className="text-sm">
                  Estos movimientos cambian el efectivo de caja; no son ventas ni ingresos
                  comerciales.
                </p>
                <OperationForm
                  scope={`cash:${userId}:${context.data.branchId}:capital`}
                  path={`/api/commerce/cash/capital-movements${query}`}
                  fields={[
                    {
                      name: "type",
                      label: "Tipo de movimiento",
                      type: "select",
                      choices: [
                        { value: "IN", label: "Aporte" },
                        { value: "OUT", label: "Retiro" },
                      ],
                    },
                    { name: "amount", label: "Monto (Q)", type: "number", min: 0.01, step: "0.01" },
                    { name: "reason", label: "Motivo", type: "textarea" },
                  ]}
                  schema={V.CapitalInputSchema}
                  resultSchema={V.CashAccountSchema}
                  label="Confirmar movimiento de capital"
                  onSaved={updated}
                />
              </section>
            ) : (
              <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5">
                <h2 className="text-xl font-semibold">Abrir caja</h2>
                <p>La apertura se registra una sola vez. Puedes comenzar con Q0.00.</p>
                <OperationForm
                  scope={`cash:${userId}:${context.data.branchId}:opening`}
                  path={`/api/commerce/cash/open${query}`}
                  fields={[
                    {
                      name: "amount",
                      label: "Capital inicial (Q)",
                      type: "number",
                      value: 0,
                      min: 0,
                      step: "0.01",
                    },
                  ]}
                  schema={V.CashOpeningSchema}
                  resultSchema={V.CashAccountSchema}
                  label="Confirmar apertura"
                  onSaved={updated}
                />
              </section>
            ))}
        </>
      )}
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget),
            params = new URLSearchParams();
          for (const key of ["dateFrom", "dateTo"]) {
            const v = String(form.get(key) ?? "");
            if (v) params.set(key, v);
          }
          setRange(params.toString());
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="cash-from">Desde</Label>
          <Input id="cash-from" name="dateFrom" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cash-to">Hasta</Label>
          <Input id="cash-to" name="dateTo" type="date" />
        </div>
        <Button type="submit">Consultar movimientos</Button>
        <Button type="button" variant="outline" onClick={movements.refresh}>
          Actualizar caja
        </Button>
      </form>
      <p className="text-sm text-[var(--tg-muted)]">
        Si no seleccionas fechas, se muestra todo el historial disponible.
      </p>
      {movements.data && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption>Movimientos de caja</caption>
            <thead>
              <tr>
                <th className="p-3">Fecha</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Saldo posterior</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movements.data.items.map((m, index) => (
                <tr key={index} className="border-t border-[var(--tg-line)]">
                  <td className="p-3">{displayInstant(m.createdAt)}</td>
                  <td>{labels[m.kind]}</td>
                  <td>Q{m.amount.toFixed(2)}</td>
                  <td>Q{m.balanceAfter.toFixed(2)}</td>
                  <td>{m.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!movements.data.items.length && <p>No hay movimientos para este filtro.</p>}
        </div>
      )}
    </div>
  );
}
