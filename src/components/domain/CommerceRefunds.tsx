"use client";
import { useState } from "react";
import { z } from "zod";
import { useCustomerData, readCustomerResponse } from "@/hooks/useCustomerData";
import { RefundSchema, RefundClaimSchema, CashSettleInputSchema } from "@/lib/validators/commerce";
import type { RefundClaim, RefundRecord } from "@/types/commerce";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const refundListSchema = RefundSchema.array();
const checkLabels: Record<string, string> = {
  REFUND_CODE_PRESENTED: "Verifiqué que se presentó el comprobante con este código",
  HOLDER_IDENTITY_VERIFIED: "Verifiqué presencialmente la identidad del titular",
};
function CashClaimPayment({
  claim,
  userId,
  onSaved,
}: {
  claim: RefundClaim;
  userId: number;
  onSaved: () => void;
}) {
  const [verified, setVerified] = useState<string[]>([]);
  const checks = [...new Set(claim.requiredChecks)];
  const unknownCheck = checks.some((check) => !checkLabels[check]);
  const ready =
    claim.cashSettleable && !unknownCheck && checks.every((check) => verified.includes(check));
  return (
    <div className="space-y-4">
      <p>
        Código del comprobante: <strong>{claim.refundCode}</strong>
      </p>
      <p>Sucursal pagadora: #{claim.operationBranchId}</p>
      <fieldset className="space-y-3">
        <legend className="mb-3 font-semibold">Comprobaciones presenciales</legend>
        {checks
          .filter((check) => checkLabels[check])
          .map((check) => (
            <label key={check} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={verified.includes(check)}
                onChange={(event) => {
                  setVerified((current) =>
                    event.target.checked
                      ? [...current, check]
                      : current.filter((item) => item !== check),
                  );
                }}
              />
              {checkLabels[check]}
            </label>
          ))}
      </fieldset>
      {unknownCheck && (
        <p role="alert">
          Este reembolso requiere una verificación adicional. Consulta
          al administrador antes de entregar efectivo.
        </p>
      )}
      {!claim.cashSettleable && (
        <p role="status">
          Este reembolso no está habilitado para pago en efectivo. Consulta su estado antes de
          entregar dinero.
        </p>
      )}
      {!ready && !unknownCheck && claim.cashSettleable && (
        <p className="text-sm">Completa las comprobaciones antes de registrar la entrega.</p>
      )}
      {ready && (
        <OperationForm
          scope={`refund-cash:${userId}:${claim.refundId}`}
          path={`/api/commerce/refunds/${claim.refundId}/settle-cash`}
          schema={CashSettleInputSchema.extend({ code: z.string().min(1) })}
          resultSchema={RefundSchema}
          base={{ code: claim.refundCode }}
          fields={[
            {
              name: "delivered",
              label: "Confirmo la entrega física del efectivo",
              type: "checkbox",
            },
          ]}
          label="Registrar pago en efectivo"
          confirmation="Confirmo una única entrega por el importe del reembolso."
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
function RefundCard({
  refund,
  userId,
  claim,
  onSaved,
}: {
  refund: RefundRecord;
  userId: number;
  claim?: RefundClaim;
  onSaved: () => void;
}) {
  const [instructions, setInstructions] = useState(false),
    [notice, setNotice] = useState("");
  return (
    <article className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-6">
      <h2 className="text-xl font-semibold">Reembolso #{refund.refundId}</h2>
      <p>
        {refund.invoiceId != null && `Factura #${refund.invoiceId} · `}
        {refund.ticketId ? `Boleto #${refund.ticketId}` : `Alquiler #${refund.rentalId}`}
      </p>
      {claim && (
        <div className="space-y-2">
          <p>
            Titular: <strong>{claim.holderName}</strong>
          </p>
          {claim.tripId != null && (
            <p>
              Viaje #{claim.tripId}
              {claim.seatRow != null &&
                claim.seatColumn != null &&
                ` · Fila ${claim.seatRow}, asiento ${claim.seatColumn}`}
            </p>
          )}
        </div>
      )}
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
          {claim ? (
            <CashClaimPayment
              claim={claim}
              userId={userId}
              onSaved={() => {
                setNotice("Pago en efectivo confirmado.");
                onSaved();
              }}
            />
          ) : (
            <>
              <Button variant="outline" onClick={() => setInstructions(!instructions)}>
                Ver instrucciones de efectivo
              </Button>
              {instructions && (
                <p className="tg-notice">
                  Presenta tu comprobante e identificación en una sucursal. Código:{" "}
                  <strong>{refund.refundCode}</strong>.
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
    [refund, setRefund] = useState<RefundClaim | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function search() {
    setLoading(true);
    setError("");
    setRefund(null);
    try {
      const result = RefundClaimSchema.parse(
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
            disabled={loading}
          />
        </div>
        <Button disabled={loading || !code.trim()}>Consultar devolución</Button>
      </form>
      <p className="text-sm">
        Puedes pagar un reembolso de otra sucursal con su código, siempre que tu caja tenga fondos.
      </p>
      {error && <p role="alert">{error}</p>}
      {refund && (
        <RefundCard
          key={`${refund.refundId}:${refund.refundCode}`}
          refund={refund}
          claim={refund}
          userId={userId}
          onSaved={() => void search()}
        />
      )}
    </div>
  );
}
