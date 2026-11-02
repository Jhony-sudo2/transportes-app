"use client";
import { useState } from "react";
import { z } from "zod";
import { useCustomerData, readCustomerResponse } from "@/hooks/useCustomerData";
import { RefundSchema, CashSettleInputSchema } from "@/lib/validators/commerce";
import type { RefundRecord } from "@/types/commerce";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const refundListSchema = RefundSchema.array();
function RefundCard({
  refund,
  userId,
  cash = false,
  onSaved,
}: {
  refund: RefundRecord;
  userId: number;
  cash?: boolean;
  onSaved: () => void;
}) {
  const [instructions, setInstructions] = useState(false),
    [notice, setNotice] = useState("");
  return (
    <article className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-6">
      <h2 className="text-xl font-semibold">Reembolso #{refund.refundId}</h2>
      <p>
        Factura #{refund.invoiceId} ·{" "}
        {refund.ticketId ? `Boleto #${refund.ticketId}` : `Alquiler #${refund.rentalId}`}
      </p>
      <p className="text-2xl font-semibold">Q{refund.amount.toFixed(2)}</p>
      <p>
        Porcentaje reconocido: {refund.appliedPercent}% ·{" "}
        {refund.status === "PENDING"
          ? "Pendiente de cobro"
          : `Pagado por ${refund.method === "CASH" ? "efectivo" : "billetera"}`}
      </p>
      {refund.reason && <p>Motivo: {refund.reason}</p>}
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {refund.status === "PENDING" && (
        <>
          {cash ? (
            <>
              <p>
                Código del comprobante: <strong>{refund.refundCode}</strong>. Verifica físicamente
                la identidad y el comprobante antes de entregar el dinero.
              </p>
              <OperationForm
                scope={`refund-cash:${userId}:${refund.refundId}`}
                path={`/api/commerce/refunds/${refund.refundId}/settle-cash`}
                schema={CashSettleInputSchema.extend({ code: z.string().min(1) })}
                resultSchema={RefundSchema}
                base={{ code: refund.refundCode }}
                fields={[
                  {
                    name: "delivered",
                    label: "Verifiqué el comprobante y confirmo la entrega física del efectivo",
                    type: "checkbox",
                  },
                ]}
                label="Registrar pago en efectivo"
                confirmation="Confirmo una única entrega por el importe del reembolso."
                onSaved={() => {
                  setNotice("Pago en efectivo confirmado.");
                  onSaved();
                }}
              />
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setInstructions(!instructions)}>
                Ver instrucciones de efectivo
              </Button>
              {instructions && (
                <p className="tg-notice">
                  Presenta tu comprobante e identificación en una sucursal. Código:{" "}
                  <strong>{refund.refundCode}</strong>. Consultar estas instrucciones mantiene el
                  reembolso pendiente y no elige un método de pago.
                </p>
              )}
              <details>
                <summary className="cursor-pointer underline">Cobrar en mi billetera</summary>
                <div className="mt-4">
                  <OperationForm
                    scope={`refund-wallet:${userId}:${refund.refundId}`}
                    path={`/api/commerce/refunds/${refund.refundId}/settle-wallet`}
                    schema={z.object({}).strict()}
                    resultSchema={RefundSchema}
                    fields={[]}
                    label="Confirmar abono inmediato a billetera"
                    confirmation={`Autorizo el abono irreversible de Q${refund.amount.toFixed(2)} a mi billetera.`}
                    onSaved={() => {
                      setNotice("Reembolso abonado a billetera.");
                      onSaved();
                    }}
                  />
                </div>
              </details>
            </>
          )}
        </>
      )}
      {refund.status === "COMPLETED" && (
        <p>
          Liquidado: {refund.settledAt}
          {refund.paidBranchId ? ` · Sucursal pagadora #${refund.paidBranchId}` : ""}
        </p>
      )}
    </article>
  );
}
export function CommerceRefunds({ userId, refundId }: { userId: number; refundId?: number }) {
  const data = useCustomerData("/api/commerce/refunds/mine", refundListSchema);
  return (
    <div className="space-y-5">
      <Button variant="outline" onClick={data.refresh}>
        Consultar estado de reembolsos
      </Button>
      <CustomerDataState loading={data.loading} error={data.error} retry={data.refresh} />
      {data.data?.length === 0 && <p>No tienes reembolsos registrados.</p>}
      {refundId && data.data && !data.data.some((r) => r.refundId === refundId) && (
        <p role="alert">No se encontró ese reembolso en tu cuenta.</p>
      )}
      {data.data
        ?.filter((r) => !refundId || r.refundId === refundId)
        .map((r) => (
          <RefundCard key={r.refundId} refund={r} userId={userId} onSaved={data.refresh} />
        ))}
    </div>
  );
}
export function CashRefunds({ userId }: { userId: number }) {
  const [code, setCode] = useState(""),
    [refund, setRefund] = useState<RefundRecord | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function search() {
    setLoading(true);
    setError("");
    setRefund(null);
    try {
      const result = RefundSchema.parse(
        await readCustomerResponse(
          await fetch(`/api/commerce/refunds/claim?code=${encodeURIComponent(code.trim())}`, {
            cache: "no-store",
          }),
        ),
      );
      setRefund(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar el comprobante.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="claim-code">Código exacto del comprobante</Label>
          <Input
            id="claim-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setRefund(null);
            }}
            maxLength={48}
          />
        </div>
        <Button disabled={loading || !code.trim()}>Consultar devolución</Button>
      </form>
      <p className="text-sm">
        Puedes pagar un reembolso de otra sucursal con su código, siempre que tu caja tenga fondos.
        No se muestran listas de clientes ajenos.
      </p>
      {error && <p role="alert">{error}</p>}
      {refund && <RefundCard refund={refund} userId={userId} cash onSaved={() => void search()} />}
    </div>
  );
}
