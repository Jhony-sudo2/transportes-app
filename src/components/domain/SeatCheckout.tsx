"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useIdempotentCommand } from "@/hooks/useIdempotentCommand";
import * as V from "@/lib/validators/commerce";
import { CivilDateSchema } from "@/lib/validators/journey";
import { guatemalaDate, displayInstant } from "@/lib/transport-time";
import type { SeatPosition, SeatHold, TicketPayment, PosCustomer } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerDataState } from "./CustomerDataState";
import { PosBuyer } from "./PosBuyer";
const stateLabels = {
  AVAILABLE: "Disponible",
  HELD: "Retenido",
  SOLD: "Vendido",
  BLOCKED: "Bloqueado",
};
export function SeatCheckout({
  tripId,
  userId,
  counter = false,
  branchId,
}: {
  tripId: number;
  userId: number;
  counter?: boolean;
  branchId?: number;
}) {
  const query = branchId ? `?branchId=${branchId}` : "",
    scope = `checkout:${userId}:${branchId ?? (counter ? "cashier" : "web")}:${tripId}`;
  const map = useCustomerData(`/api/commerce/seats/${tripId}${query}`, V.SeatMapSchema),
    context = useCustomerData(
      counter ? `/api/commerce/context${query}` : "/api/commerce/wallet",
      contextSchema,
    ),
    cash = useCustomerData(
      counter ? `/api/commerce/cash${query}` : "/api/commerce/wallet",
      cashStateSchema,
    );
  const holdCommand = useIdempotentCommand(scope + ":hold"),
    payment = useIdempotentCommand(scope + ":payment");
  const [selected, setSelected] = useState<SeatPosition[]>([]),
    [hold, setHold] = useState<SeatHold | null>(null),
    [now, setNow] = useState(Date.now()),
    [paymentDate, setPaymentDate] = useState(guatemalaDate()),
    [customer, setCustomer] = useState<PosCustomer | null>(null),
    [cf, setCf] = useState(false),
    [email, setEmail] = useState(""),
    [result, setResult] = useState<TicketPayment | null>(null),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [ready, setReady] = useState(false);
  const holdStorage = `transport:hold:${scope}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(holdStorage);
      if (raw) setHold(V.HoldSchema.parse(JSON.parse(raw)));
    } catch {
      setError(
        "La retención anterior no se pudo recuperar. Consulta tus compras antes de continuar.",
      );
    }
    setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [holdStorage]);
  const expired = hold !== null && Date.parse(hold.expiresAt) <= now,
    locked = holdCommand.busy || payment.busy || !!payment.pending;
  const enabled = counter
    ? cash.data && "initializedAt" in cash.data && cash.data.initializedAt !== null
    : cash.data && "wallet" in cash.data && cash.data.wallet.active;
  async function retain() {
    setError("");
    const body = holdCommand.pending?.body ?? { seats: selected };
    const parsed = V.HoldInputSchema.safeParse(body);
    if (!parsed.success) {
      setError("Selecciona al menos un asiento disponible.");
      return;
    }
    const h = await holdCommand.execute(
      `/api/commerce/seats/${tripId}/holds${query}`,
      parsed.data,
      V.HoldSchema,
    );
    if (h) {
      setHold(h);
      sessionStorage.setItem(holdStorage, JSON.stringify(h));
      map.refresh();
    }
  }
  async function pay() {
    setError("");
    if (!payment.pending && !confirmed) {
      setError("Confirma el importe y los datos de la compra.");
      return;
    }
    if (!payment.pending && (!hold || expired)) {
      setError("La retención venció. Actualiza los asientos.");
      return;
    }
    if (!CivilDateSchema.safeParse(paymentDate).success && !payment.pending) {
      setError("Selecciona una fecha de pago válida.");
      return;
    }
    const body = payment.pending?.body ?? {
      holdId: hold?.holdId,
      paymentDate,
      ...(counter
        ? {
            nit: cf ? "CF" : customer?.nit,
            ...(email.trim() && !customer?.hasUser ? { contactEmail: email.trim() } : {}),
          }
        : {}),
    };
    const schema = counter ? V.CounterPaymentInputSchema : V.TicketPaymentInputSchema,
      parsed = schema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    const paid = await payment.execute(
      `/api/commerce/payments/${counter ? "counter" : "tickets"}${query}`,
      parsed.data,
      counter ? V.CounterPaymentSchema : V.TicketPaymentSchema,
    );
    if (paid) {
      setResult(paid);
      setHold(null);
      sessionStorage.removeItem(holdStorage);
      map.refresh();
      cash.refresh();
    }
  }
  return (
    <div className="space-y-6">
      <CustomerDataState
        loading={map.loading || context.loading || cash.loading}
        error={map.error || context.error || cash.error}
        retry={() => {
          map.refresh();
          context.refresh();
          cash.refresh();
        }}
      />
      {counter && context.data && "branchName" in context.data && (
        <p className="tg-notice">
          Sucursal de cobro: <strong>{context.data.branchName}</strong>
        </p>
      )}
      {!counter && cash.data && "wallet" in cash.data && (
        <p>Saldo disponible: Q{cash.data.wallet.balance.toFixed(2)}</p>
      )}
      {counter && cash.data && "initializedAt" in cash.data && cash.data.initializedAt === null && (
        <p role="alert">
          La caja no está inicializada. El administrador debe abrirla antes de cobrar.
        </p>
      )}
      {result ? (
        <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-6">
          <h2 className="text-2xl font-semibold">Compra confirmada</h2>
          <p>
            Factura #{result.invoiceId} · Total Q{result.totalAmount.toFixed(2)}
          </p>
          <p>{result.tickets.length} boletos emitidos.</p>
          {counter && (
            <p>
              Sucursal de compra #{result.sourceBranchId} · Vendedor #{result.sellerUserId}
            </p>
          )}
          <Button asChild>
            <Link href={`/receipts/${result.invoiceId}${query}`}>Ver e imprimir comprobante</Link>
          </Button>
        </section>
      ) : (
        <>
          {map.data && (
            <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5">
              <h2 className="text-xl font-semibold">Asientos del viaje #{tripId}</h2>
              <p className="text-sm">
                Selecciona las plazas disponibles. Los espacios sin asiento no se pueden comprar.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(stateLabels).map(([key, label]) => (
                  <span key={key}>{label}</span>
                ))}
              </div>
              <div className="overflow-x-auto">
                <div
                  role="group"
                  aria-label="Mapa de asientos"
                  className="mx-auto grid w-fit gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${map.data.seatColumns}, minmax(3rem, 1fr))`,
                  }}
                >
                  {Array.from({ length: map.data.seatRows * map.data.seatColumns }, (_, index) => {
                    const row = Math.floor(index / (map.data?.seatColumns ?? 1)) + 1,
                      column = (index % (map.data?.seatColumns ?? 1)) + 1,
                      seat = map.data?.seats.find((s) => s.row === row && s.column === column),
                      picked = selected.some((s) => s.row === row && s.column === column);
                    return seat ? (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Fila ${row}, asiento ${column}: ${stateLabels[seat.state]}${seat.reason ? `, ${seat.reason}` : ""}`}
                        aria-pressed={picked}
                        disabled={
                          locked || !!hold || !!holdCommand.pending || seat.state !== "AVAILABLE"
                        }
                        title={seat.reason ?? stateLabels[seat.state]}
                        className={`h-12 min-w-12 rounded-lg border text-sm disabled:opacity-60 ${picked ? "border-[var(--tg-green)] bg-[var(--tg-green)] text-white" : seat.state === "AVAILABLE" ? "border-[var(--tg-green)] bg-[var(--tg-paper)]" : "border-[var(--tg-line)] bg-gray-200 text-gray-800"}`}
                        onClick={() =>
                          setSelected(
                            picked
                              ? selected.filter((s) => s.row !== row || s.column !== column)
                              : [...selected, { row, column }],
                          )
                        }
                      >
                        {row}-{column}
                      </button>
                    ) : (
                      <span key={index} aria-hidden="true" />
                    );
                  })}
                </div>
              </div>
              {!hold && (
                <Button
                  disabled={
                    !ready || locked || (!selected.length && !holdCommand.pending) || !enabled
                  }
                  onClick={() => void retain()}
                >
                  {holdCommand.pending ? "Recuperar retención" : "Retener asientos seleccionados"}
                </Button>
              )}
              {hold && (
                <div className="space-y-3">
                  <p role="status">
                    {expired
                      ? "La retención venció."
                      : `Retención vigente: ${Math.max(0, Math.ceil((Date.parse(hold.expiresAt) - now) / 1000))} segundos.`}
                  </p>
                  <p>
                    Total confirmado: <strong>Q{hold.totalAmount.toFixed(2)}</strong> · Vence{" "}
                    {displayInstant(hold.expiresAt)}
                  </p>
                  {expired && !payment.pending && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setHold(null);
                        setSelected([]);
                        sessionStorage.removeItem(holdStorage);
                        map.refresh();
                      }}
                    >
                      Actualizar mapa y elegir nuevamente
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}
          {counter && (
            <PosBuyer
              scope={scope}
              query={query}
              disabled={locked}
              onChange={(c, isCf, contact) => {
                setCustomer(c);
                setCf(isCf);
                setEmail(contact);
              }}
            />
          )}
          {(hold || payment.pending) && (
            <section className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-5">
              <h2 className="text-xl font-semibold">
                {counter ? "Cobrar en efectivo" : "Pagar con billetera"}
              </h2>
              {payment.pending ? (
                <p className="tg-notice">
                  Hay un pago por confirmar. Recupera la misma operación antes de iniciar otra.
                  {counter
                    ? " No vuelvas a cobrar efectivo."
                    : " Conserva esta referencia para consultar el resultado de la compra."}
                </p>
              ) : (
                <>
                  <Label htmlFor="checkout-date">Fecha de pago</Label>
                  <Input
                    id="checkout-date"
                    type="date"
                    value={paymentDate}
                    disabled={locked}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                  <label className="flex gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={locked}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    {counter
                      ? "Confirmo los datos y la recepción del efectivo por el total indicado."
                      : "Confirmo los datos y autorizo el débito por el total indicado."}
                  </label>
                </>
              )}
              <Button
                disabled={
                  !payment.ready ||
                  (locked && !payment.pending) ||
                  payment.busy ||
                  (!payment.pending && (!enabled || expired || (counter && !cf && !customer)))
                }
                onClick={() => void pay()}
              >
                {payment.pending
                  ? "Recuperar mismo pago"
                  : counter
                    ? "Confirmar cobro"
                    : "Confirmar compra"}
              </Button>
            </section>
          )}
        </>
      )}
      {(error || holdCommand.error || payment.error) && (
        <p role="alert" className="tg-notice">
          {error || holdCommand.error || payment.error}
        </p>
      )}
    </div>
  );
}
import { z } from "zod";
const walletStateSchema = z.object({ wallet: V.CommerceWalletSchema });
const contextSchema = z.union([V.CashContextSchema, walletStateSchema]);
const cashStateSchema = z.union([V.CashAccountSchema, walletStateSchema]);
