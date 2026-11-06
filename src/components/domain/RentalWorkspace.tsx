"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as V from "@/lib/validators/rentals";
import type {
  RentalQuote,
  RentalContract,
  QuotePriceComponent,
  RentalContext,
  RentalPayment,
} from "@/types/rentals";
import type { OperationField } from "@/types/operation-form";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useBranchWorkspace } from "@/components/layout/BranchWorkspaceProvider";
import { guatemalaDate, guatemalaDateTime, displayInstant } from "@/lib/transport-time";
import { driverAvailability, busAvailability } from "@/lib/fleet-availability";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { PriceComponentsEditor } from "./PriceComponentsEditor";
import { TripActionDialog } from "./TripActionDialog";
import { JourneyTripsClient } from "./JourneyTripsClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const contextSchema = V.RentalContextSchema;
const quotesSchema = V.RentalQuoteSchema.array(),
  contractsSchema = V.RentalContractSchema.array();
const resourceSchema = V.RentalResourcesSchema;
type Context = RentalContext;
const stateLabels = {
  PENDING_APPROVAL: "Pendiente de aprobación",
  APPROVED: "Aprobada",
  PAID: "Pagada",
  CANCELLING: "Cancelación en proceso",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
};
const rentalLabels = {
  PAID: "Pagado",
  CANCELLING: "Cancelación en proceso",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
};
const tripLabels = {
  SCHEDULED: "Programado",
  CANCELLING: "Cancelación en proceso",
  CANCELLED: "Cancelado",
  IN_TRANSIT: "En tránsito",
  COMPLETED: "Finalizado",
};
function approvalFields(context: Context, branchId?: number, hasReturn = false): OperationField[] {
  return [
    ...(branchId
      ? []
      : [
          {
            name: "managingBranchId",
            label: "Sucursal gestora",
            type: "select" as const,
            numeric: true,
            choices: context.branches
              .filter((b) => b.active === true)
              .map((b) => ({ value: String(b.id), label: b.name })),
          },
        ]),
    {
      name: "estimatedOutboundKm",
      label: "Kilómetros estimados de ida",
      type: "number",
      min: 0.01,
    },
    {
      name: "outboundArrivalEstimateAt",
      label: "Llegada estimada de ida (Guatemala)",
      type: "datetime-local",
      value: guatemalaDateTime(new Date(Date.now() + 3600000)),
    },
    ...(hasReturn
      ? [
          {
            name: "estimatedReturnKm",
            label: "Kilómetros estimados de retorno",
            type: "number" as const,
            min: 0.01,
          },
          {
            name: "returnArrivalEstimateAt",
            label: "Llegada estimada de retorno (Guatemala)",
            type: "datetime-local" as const,
          },
        ]
      : []),
    {
      name: "outboundDriverBaseSalary",
      label: "Salario base de ida (Q)",
      type: "number",
      optional: true,
      min: 0,
    },
    ...(hasReturn
      ? [
          {
            name: "returnDriverBaseSalary",
            label: "Salario base de retorno (Q)",
            type: "number" as const,
            optional: true,
            min: 0,
          },
        ]
      : []),
    {
      name: "finalPrice",
      label: "Precio final total aprobado (Q)",
      type: "number",
      min: 0.01,
      step: "0.01",
    },
    {
      name: "priceJustification",
      label: "Justificación si el precio difiere del costo estimado",
      type: "textarea",
      optional: true,
    },
  ];
}
export function RentalWorkspace({
  userId,
  role,
  branchId,
  contractBase,
}: {
  userId: number;
  role: string;
  branchId?: number;
  contractBase: string;
}) {
  if (role === "CAJERO") return <CashierQuoteWorkspace userId={userId} />;
  return (
    <RentalWorkspaceBody
      userId={userId}
      role={role}
      {...(branchId ? { branchId } : {})}
      contractBase={contractBase}
    />
  );
}
function RentalWorkspaceBody({
  userId,
  role,
  branchId,
  contractBase,
}: {
  userId: number;
  role: string;
  branchId?: number;
  contractBase: string;
}) {
  const query = branchId ? `?branchId=${branchId}` : "",
    [filter, setFilter] = useState(""),
    [notice, setNotice] = useState("");
  const context = useCustomerData(`/api/rentals/context${query}`, contextSchema),
    quotes = useCustomerData(
      `/api/rentals/quotes${query}${filter ? `${query ? "&" : "?"}${filter}` : ""}`,
      quotesSchema,
    );
  const [creating, setCreating] = useState(false),
    [hasReturn, setHasReturn] = useState(false),
    [components, setComponents] = useState<QuotePriceComponent[]>([]),
    { busy } = useBranchWorkspace();
  const customer = role === "CUSTOMER",
    cashier = role === "CAJERO",
    admin = !customer && !cashier;
  const fields: OperationField[] = context.data
    ? [
        { name: "origin", label: "Origen" },
        { name: "destination", label: "Destino" },
        {
          name: "departureAt",
          label: "Salida de ida (Guatemala)",
          type: "datetime-local",
          value: guatemalaDateTime(),
        },
        ...(hasReturn
          ? [
              {
                name: "returnDepartureAt",
                label: "Salida de retorno (Guatemala)",
                type: "datetime-local" as const,
              },
            ]
          : []),
        { name: "passengerCount", label: "Pasajeros", type: "number", min: 1, step: "1" },
        {
          name: "busTypeId",
          label: "Tipo de bus",
          type: "select",
          numeric: true,
          choices: context.data.busTypes
            .filter((t) => t.active !== false)
            .map((t) => ({
              value: String(t.id),
              label: `${t.name} · ${t.capacity} pasajeros${t.availabilityHint === "NONE" ? " · Sin disponibilidad" : ""}`,
            })),
        },
        { name: "waitHours", label: "Horas de espera", type: "number", value: 0, min: 0 },
        ...(admin
          ? [
              { name: "nit", label: "NIT del Customer existente o CF" },
              {
                name: "contactEmail",
                label: "Correo para aviso de cotización",
                type: "email" as const,
                optional: true,
              },
              ...approvalFields(context.data, branchId, hasReturn),
            ]
          : []),
      ]
    : [];
  return (
    <div className="space-y-6">
      <p className="text-sm">
        La cotización no reserva buses. El pago es único para los tramos contratados; los recursos
        se asignan después del cobro.
      </p>
      <CustomerDataState
        loading={context.loading || quotes.loading}
        error={context.error || quotes.error}
        retry={() => {
          context.refresh();
          quotes.refresh();
        }}
      />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {!cashier && (
        <Button disabled={!context.data || busy} onClick={() => setCreating(!creating)}>
          {creating
            ? "Cerrar solicitud"
            : customer
              ? "Solicitar cotización"
              : "Crear cotización aprobada"}
        </Button>
      )}
      {creating && context.data && (
        <section className="space-y-5 rounded-2xl border border-[var(--tg-line)] p-6">
          <h2 className="text-xl font-semibold">
            {customer ? "Solicitud de viaje privado" : "Cotización administrativa"}
          </h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={hasReturn}
              disabled={busy}
              onChange={(e) => setHasReturn(e.target.checked)}
            />
            Incluir viaje de retorno
          </label>
          {admin && <PriceComponentsEditor items={components} onChange={setComponents} />}
          <OperationForm
            key={`${hasReturn}`}
            monetary={false}
            scope={`quote-create:${userId}:${branchId ?? "global"}`}
            path={`/api/rentals/quotes${admin ? "/admin" : ""}${query}`}
            fields={fields}
            base={
              admin
                ? {
                    priceComponents: components,
                    ...(branchId ? { managingBranchId: branchId } : {}),
                  }
                : {}
            }
            schema={admin ? V.AdminQuoteInputSchema : V.CheckedRentalQuoteInputSchema}
            resultSchema={V.RentalQuoteSchema}
            label={
              customer ? "Enviar solicitud de cotización" : "Confirmar precio y crear cotización"
            }
            onSaved={() => {
              setNotice(
                customer
                  ? "Solicitud enviada. Espera la aprobación y el precio final."
                  : "Cotización aprobada y registrada.",
              );
              setCreating(false);
              quotes.refresh();
            }}
          />
        </section>
      )}
      {admin && (
        <label className="block space-y-2">
          <span>Estado de cotizaciones</span>
          <select
            className="h-12 rounded-lg border bg-[var(--tg-paper)] px-3"
            onChange={(e) => setFilter(e.target.value ? `status=${e.target.value}` : "")}
          >
            <option value="">Todos</option>
            <option value="PENDING_APPROVAL">Pendientes</option>
            <option value="APPROVED">Aprobadas</option>
            <option value="PAID">Pagadas</option>
          </select>
        </label>
      )}
      {cashier && (
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const ref = String(new FormData(e.currentTarget).get("reference") ?? "");
            setFilter(ref ? `reference=${encodeURIComponent(ref)}` : "");
          }}
        >
          <Input
            name="reference"
            aria-label="Referencia exacta de cotización"
            placeholder="Referencia de cotización"
          />
          <Button>Consultar cobrables</Button>
        </form>
      )}
      <Button variant="outline" disabled={busy} onClick={quotes.refresh}>
        Consultar estado de cotizaciones
      </Button>
      {quotes.data?.length === 0 && <p>No hay cotizaciones para mostrar.</p>}
      {quotes.data?.map((q) => (
        <QuoteCard
          key={q.quoteId}
          quote={q}
          context={context.data}
          userId={userId}
          role={role}
          {...(branchId ? { branchId } : {})}
          contractBase={contractBase}
          refresh={quotes.refresh}
          onNotice={setNotice}
        />
      ))}
      {customer && <RentalHistory userId={userId} contractBase={contractBase} />}
      {role === "SUCURSAL_ADMIN" && branchId && (
        <section className="space-y-5">
          <h2 className="text-2xl font-semibold">Viajes privados operativos de la sucursal</h2>
          <JourneyTripsClient branchId={branchId} privateTrips />
        </section>
      )}
      {role === "ADMIN" && <RentalPolicyForm userId={userId} />}
    </div>
  );
}
function CashierQuoteWorkspace({ userId }: { userId: number }) {
  const [reference, setReference] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <div className="space-y-6">
      <p>Busca la referencia exacta de la cotización aprobada para consultar su precio.</p>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setReference(String(new FormData(event.currentTarget).get("reference") ?? "").trim());
          setNotice("");
        }}
      >
        <Input
          name="reference"
          aria-label="Referencia exacta de cotización"
          maxLength={32}
          required
        />
        <Button>Consultar cobrables</Button>
      </form>
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {reference && (
        <CashierQuoteResults
          key={reference}
          reference={reference}
          userId={userId}
          onNotice={setNotice}
        />
      )}
    </div>
  );
}
function CashierQuoteResults({
  reference,
  userId,
  onNotice,
}: {
  reference: string;
  userId: number;
  onNotice: (value: string) => void;
}) {
  const quotes = useCustomerData(
    `/api/rentals/quotes?reference=${encodeURIComponent(reference)}`,
    V.PayableQuoteSchema.array(),
  );
  return (
    <div className="space-y-5">
      <CustomerDataState loading={quotes.loading} error={quotes.error} retry={quotes.refresh} />
      {quotes.data?.length === 0 && (
        <p>No se encontró una cotización cobrable con esa referencia.</p>
      )}
      {quotes.data?.map((quote) => (
        <CashierQuoteCard
          key={quote.quoteId}
          quote={quote}
          userId={userId}
          onSaved={(payment) => {
            onNotice(
              `Pago confirmado en la factura #${payment.invoiceId}. Consulta su comprobante antes de repetir el cobro.`,
            );
          }}
        />
      ))}
    </div>
  );
}
function CashierQuoteCard({
  quote,
  userId,
  onSaved,
}: {
  quote: import("@/types/rentals").PayableQuote;
  userId: number;
  onSaved: (payment: RentalPayment) => void;
}) {
  const key = `transport:rental-paid:${userId}:${quote.quoteId}`;
  const [payment, setPayment] = useState<RentalPayment | null>(null);
  const [recoveryError, setRecoveryError] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = V.RentalPaymentSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setPayment(parsed.data);
        else setRecoveryError(true);
      }
    } catch {
      setRecoveryError(true);
    }
  }, [key]);
  return (
    <article className="space-y-4 rounded-2xl border border-[var(--tg-line)] p-6">
      <h2 className="text-xl font-semibold">Cotización #{quote.quoteId}</h2>
      <p>
        NIT: {quote.customerNit} · Precio global: Q{quote.finalPrice.toFixed(2)}
      </p>
      <p>Vence: {displayInstant(quote.expiresAt)}</p>
      {recoveryError ? (
        <p role="alert">Consulta el estado del pago antes de intentar cobrar nuevamente.</p>
      ) : payment ? (
        <Link className="underline" href={`/receipts/${payment.invoiceId}`}>
          Ver comprobante
        </Link>
      ) : Date.parse(quote.expiresAt) <= Date.now() ? (
        <p>La cotización venció. Consulta nuevamente su estado.</p>
      ) : (
        <OperationForm
          scope={`quote-pay:${userId}:${quote.quoteId}`}
          path="/api/rentals/payments"
          schema={V.RentalPaymentInputSchema}
          resultSchema={V.RentalPaymentSchema}
          base={{ quoteId: quote.quoteId }}
          fields={[
            { name: "paymentDate", label: "Fecha de pago", type: "date", value: guatemalaDate() },
            {
              name: "contactEmail",
              label: "Correo de entrega si el comprador no tiene cuenta",
              type: "email",
              optional: true,
            },
          ]}
          label="Confirmar cobro en efectivo"
          confirmation="Confirmo la recepción del efectivo por el precio global aprobado."
          onSaved={(result) => {
            sessionStorage.setItem(key, JSON.stringify(result));
            setPayment(result);
            onSaved(result);
          }}
        />
      )}
    </article>
  );
}
function QuoteCard({
  quote: q,
  context,
  userId,
  role,
  branchId,
  contractBase,
  refresh,
  onNotice: setNotice,
}: {
  quote: RentalQuote;
  context: Context | null;
  userId: number;
  role: string;
  branchId?: number;
  contractBase: string;
  refresh: () => void;
  onNotice: (message: string) => void;
}) {
  const admin = role === "ADMIN" || role === "SUCURSAL_ADMIN",
    query = branchId ? `?branchId=${branchId}` : "",
    [components, setComponents] = useState<QuotePriceComponent[]>(q.priceComponents ?? []),
    [paid, setPaid] = useState<RentalPayment | null>(null);
  const key = `transport:rental-paid:${userId}:${q.quoteId}`;
  const [recoveryError, setRecoveryError] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const result = V.RentalPaymentSchema.safeParse(JSON.parse(raw));
        if (result.success) setPaid(result.data);
        else setRecoveryError(true);
      }
    } catch {
      setRecoveryError(true);
    }
  }, [key]);
  const paymentConfirmed = q.status === "PAID" || !!paid;
  return (
    <article className="space-y-5 rounded-2xl border border-[var(--tg-line)] bg-[var(--tg-paper)] p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl font-semibold">Cotización {q.quoteReference ?? `#${q.quoteId}`}</h2>
        <span>{paymentConfirmed ? "Pago confirmado" : stateLabels[q.status]}</span>
      </div>
      <p>
        {q.origin} → {q.destination} · {q.passengerCount} pasajeros
      </p>
      <p>
        Ida: {displayInstant(q.departureAt)}
        {q.returnDepartureAt ? ` · Retorno: ${displayInstant(q.returnDepartureAt)}` : ""}
      </p>
      <p>
        Espera: {q.waitHours} horas · Tipo de bus #{q.busTypeId}
      </p>
      <p>Vence: {displayInstant(q.expiresAt)}</p>
      {q.finalPrice !== null && (
        <p className="text-2xl font-semibold">Precio global: Q{q.finalPrice.toFixed(2)}</p>
      )}
      {admin && q.estimatedCost != null && (
        <p>Estimado interno informado: Q{q.estimatedCost.toFixed(2)}</p>
      )}
      {admin && q.status === "PENDING_APPROVAL" && context && (
        <details>
          <summary className="cursor-pointer underline">Revisar y aprobar precio final</summary>
          <div className="mt-4 space-y-5">
            <PriceComponentsEditor items={components} onChange={setComponents} />
            <OperationForm
              monetary={false}
              scope={`quote-approve:${userId}:${q.quoteId}`}
              path={`/api/rentals/quotes/${q.quoteId}/approve${query}`}
              schema={V.QuoteApprovalSchema}
              resultSchema={V.RentalQuoteSchema}
              fields={approvalFields(context, branchId, !!q.returnDepartureAt)}
              base={{
                priceComponents: components,
                ...(branchId ? { managingBranchId: branchId } : {}),
              }}
              label="Confirmar aprobación"
              onSaved={() => {
                setNotice("Precio aprobado. Su vigencia comienza desde la aprobación.");
                refresh();
              }}
            />
          </div>
        </details>
      )}
      {recoveryError && !paymentConfirmed && (
        <p role="alert">
          No se pudieron recuperar los datos del pago. Consulta el comprobante y el estado de
          la cotización antes de intentar cobrar nuevamente.
        </p>
      )}
      {!admin && q.status === "APPROVED" && !paymentConfirmed && !recoveryError && (
        <section className="space-y-4">
          <p>
            El pago total será por el precio aprobado, sin cargos posteriores por asignación o
            finalización.
          </p>
          <OperationForm
            scope={`quote-pay:${userId}:${q.quoteId}`}
            path={`/api/rentals/payments${query}`}
            schema={V.RentalPaymentInputSchema}
            resultSchema={V.RentalPaymentSchema}
            fields={[
              { name: "paymentDate", label: "Fecha de pago", type: "date", value: guatemalaDate() },
              ...(role === "CAJERO"
                ? [
                    {
                      name: "contactEmail",
                      label: "Correo de entrega si el comprador no tiene cuenta",
                      type: "email" as const,
                      optional: true,
                    },
                  ]
                : []),
            ]}
            base={{ quoteId: q.quoteId }}
            label={
              role === "CAJERO" ? "Confirmar cobro en efectivo" : "Confirmar pago con billetera"
            }
            confirmation={
              role === "CAJERO"
                ? "Confirmo la recepción del efectivo por el precio global aprobado."
                : "Autorizo el débito único del precio global desde mi billetera."
            }
            onSaved={(r) => {
              setPaid(r);
              sessionStorage.setItem(key, JSON.stringify(r));
              setNotice("Pago confirmado. No vuelvas a pagar mientras se registra el alquiler.");
              refresh();
            }}
          />
        </section>
      )}
      {paymentConfirmed && (
        <div className="space-y-3">
          <p className="tg-notice">
            {q.rentalId
              ? "Alquiler registrado. Consulta la contratación y sus tramos."
              : "Pago confirmado; registro del alquiler en proceso. Consulta el estado sin repetir el pago."}
          </p>
          {(q.invoiceId || paid?.invoiceId) && (
            <Link
              className="mr-5 underline"
              href={`/receipts/${q.invoiceId ?? paid?.invoiceId}${query}`}
            >
              Ver comprobante
            </Link>
          )}
          {q.rentalId && role !== "CAJERO" && (
            <Link className="underline" href={`${contractBase}/${q.rentalId}`}>
              Ver alquiler y tramos
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
function RentalHistory({ userId: _, contractBase }: { userId: number; contractBase: string }) {
  const history = useCustomerData("/api/rentals/contracts", contractsSchema);
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Mis alquileres pagados</h2>
      <CustomerDataState loading={history.loading} error={history.error} retry={history.refresh} />
      {history.data?.length === 0 && <p>No tienes contrataciones registradas.</p>}
      {history.data?.map((r) => (
        <article
          key={r.rentalId}
          className="space-y-3 rounded-xl border border-[var(--tg-line)] p-5"
        >
          <h3>
            Alquiler #{r.rentalId} · {rentalLabels[r.status]}
          </h3>
          <p>
            {r.legs.length} tramo(s) · Factura #{r.invoiceId}
          </p>
          <Link className="underline" href={`${contractBase}/${r.rentalId}`}>
            Consultar contratación
          </Link>
        </article>
      ))}
    </section>
  );
}
function RentalPolicyForm({ userId }: { userId: number }) {
  const policy = useCustomerData("/api/rentals/policy", V.OptionalRentalPolicySchema),
    [notice, setNotice] = useState("");
  const loaded = !policy.loading && !policy.error;
  return (
    <details open={loaded && policy.data === null ? true : undefined}>
      <summary className="cursor-pointer underline">Política global de cotizaciones</summary>
      <div className="mt-4 space-y-4">
        <CustomerDataState loading={policy.loading} error={policy.error} retry={policy.refresh} />
        {notice && <p role="status">{notice}</p>}
        {loaded && policy.data === null && (
          <p role="status" className="tg-notice">
            Aún no hay una política de cotización configurada. Defínela para poder crear
            cotizaciones de alquiler.
          </p>
        )}
        {loaded && (
          <OperationForm
            key={policy.data ? "configured" : "new"}
            monetary={false}
            scope={`quote-policy:${userId}`}
            path="/api/rentals/policy"
            method="PUT"
            schema={V.RentalPolicySchema}
            resultSchema={V.RentalPolicySchema}
            fields={[
              {
                name: "validityDays",
                label: "Días de vigencia",
                type: "number",
                min: 1,
                step: "1",
                value: policy.data?.validityDays,
              },
              {
                name: "waitCostPerHour",
                label: "Tarifa de espera por hora (Q)",
                type: "number",
                min: 0,
                value: policy.data?.waitCostPerHour,
              },
            ]}
            label="Guardar política de cotización"
            onSaved={() => {
              setNotice("Política actualizada para futuras cotizaciones.");
              policy.refresh();
            }}
          />
        )}
      </div>
    </details>
  );
}
export function RentalContractView({
  rentalId,
  userId,
  role,
  branchId,
}: {
  rentalId: number;
  userId: number;
  role: string;
  branchId?: number;
}) {
  const query = branchId ? `?branchId=${branchId}` : "",
    rental = useCustomerData(`/api/rentals/contracts/${rentalId}${query}`, V.RentalContractSchema),
    context = useCustomerData(`/api/rentals/context${query}`, contextSchema),
    [notice, setNotice] = useState("");
  const admin = role === "ADMIN" || role === "SUCURSAL_ADMIN";
  const saved = (message: string) => {
    setNotice(message);
    rental.refresh();
  };
  return (
    <div className="space-y-6">
      <CustomerDataState
        loading={rental.loading || context.loading}
        error={rental.error || context.error}
        retry={() => {
          rental.refresh();
          context.refresh();
        }}
      />
      {notice && (
        <p role="status" className="tg-notice">
          {notice}
        </p>
      )}
      {rental.data && (
        <>
          <h2 className="text-2xl font-semibold">
            Alquiler #{rental.data.rentalId} · {rentalLabels[rental.data.status]}
          </h2>
          <p>
            Una sola factura: #{rental.data.invoiceId} · Cotización #{rental.data.quoteId} ·
            Sucursal gestora #{rental.data.managingBranchId}
          </p>
          <Link className="underline" href={`/receipts/${rental.data.invoiceId}${query}`}>
            Ver factura
          </Link>
          {rental.data.legs.map((leg) => (
            <article
              key={leg.tripId}
              className="space-y-3 rounded-2xl border border-[var(--tg-line)] p-5"
            >
              <h3 className="text-xl font-semibold">
                {leg.legType === "OUTBOUND" ? "Ida" : "Retorno"} · Viaje #{leg.tripId}
              </h3>
              <p>
                {displayInstant(leg.scheduledDepartureAt)} →{" "}
                {displayInstant(leg.scheduledArrivalAt)}
              </p>
              <p>
                {admin && leg.operatingBranchId && (leg.busId || leg.driverId) ? (
                  <LegResourceNames
                    branchId={leg.operatingBranchId}
                    busId={leg.busId}
                    driverId={leg.driverId}
                  />
                ) : (
                  <>
                    Bus {leg.busId ?? "sin asignar"} · Chofer {leg.driverId ?? "sin asignar"}
                  </>
                )}{" "}
                · {tripLabels[leg.status]}
              </p>
              {leg.departure && (
                <p>
                  Salida: {displayInstant(leg.departure.actualDepartureAt)}, {leg.departure.startKm}{" "}
                  km
                </p>
              )}
              {leg.arrival && (
                <p>
                  Llegada: {displayInstant(leg.arrival.actualArrivalAt)}, {leg.arrival.endKm} km,
                  combustible Q{leg.arrival.fuelCost.toFixed(2)}
                </p>
              )}
              {role === "SUCURSAL_ADMIN" &&
                leg.operatingBranchId === branchId &&
                leg.busId &&
                leg.driverId &&
                (leg.status === "SCHEDULED" || leg.status === "IN_TRANSIT") && (
                  <TripActionDialog
                    trip={leg}
                    actor="branch"
                    action={leg.status === "SCHEDULED" ? "departure" : "arrival"}
                    {...(branchId ? { branchId } : {})}
                    pathBase={`/api/rentals/contracts/${rentalId}/legs`}
                    onSaved={saved}
                  />
                )}
            </article>
          ))}
          {rental.data.status === "PAID" &&
            rental.data.legs.every((l) => l.status === "SCHEDULED") && (
              <>
                {admin && context.data && (
                  <RentalAssignment
                    rental={rental.data}
                    context={context.data}
                    userId={userId}
                    {...(branchId ? { branchId } : {})}
                    onSaved={() => saved("Recursos confirmados para los tramos contratados.")}
                  />
                )}
                <details>
                  <summary className="cursor-pointer underline">Cancelar alquiler completo</summary>
                  <div className="mt-4 space-y-4">
                    <p>
                      La cancelación voluntaria usa el porcentaje global vigente y no el corte de
                      minutos del boleto. La cancelación empresarial autorizada reconoce el 100%.
                    </p>
                    <RentalCancellation
                      rental={rental.data}
                      userId={userId}
                      admin={admin}
                      query={query}
                      saved={saved}
                    />
                  </div>
                </details>
              </>
            )}
          {rental.data.status === "CANCELLING" && (
            <p className="tg-notice">
              Cancelación en proceso. Consulta el estado en unos minutos.
            </p>
          )}
          <Button variant="outline" onClick={rental.refresh}>
            Consultar estado del alquiler
          </Button>
        </>
      )}
    </div>
  );
}
function RentalCancellation({
  rental,
  userId,
  admin,
  query,
  saved,
}: {
  rental: RentalContract;
  userId: number;
  admin: boolean;
  query: string;
  saved: (message: string) => void;
}) {
  const [cause, setCause] = useState<"VOLUNTARY" | "BUSINESS_INCIDENT">("VOLUNTARY");
  const preview = rental.cancellationPreview?.[cause];
  return (
    <div className="space-y-4">
      {admin && (
        <label>
          Causa de cancelación
          <select
            className="ml-3 rounded-lg border bg-[var(--tg-paper)] p-3"
            value={cause}
            onChange={(e) => setCause(e.target.value as typeof cause)}
          >
            <option value="VOLUNTARY">Solicitud voluntaria presencial</option>
            <option value="BUSINESS_INCIDENT">Cancelación empresarial</option>
          </select>
        </label>
      )}
      {preview ? (
        <p className="tg-notice">
          {preview.eligible
            ? `Derecho exacto informado: Q${preview.amount.toFixed(2)} (${preview.appliedPercent}%). Su cobro se tramita por separado.`
            : (preview.reason ?? "El alquiler no admite esta cancelación.")}
        </p>
      ) : (
        <p role="status">
          El importe exacto aún no está disponible. Actualiza el alquiler antes de confirmar.
        </p>
      )}
      {preview?.eligible && (
        <OperationForm
          key={cause}
          scope={`rental-cancel:${userId}:${rental.rentalId}`}
          path={`/api/rentals/contracts/${rental.rentalId}/cancel${query}`}
          schema={V.RentalCancelSchema}
          resultSchema={V.RentalCancelResultSchema}
          base={{ cause }}
          fields={[{ name: "reason", label: "Motivo", type: "textarea" }]}
          label="Confirmar cancelación completa"
          confirmation={`Confirmo cancelar ambos tramos y reconocer el derecho de Q${preview.amount.toFixed(2)}, pendiente de cobro.`}
          onSaved={(r) =>
            saved(
              r.status === "CANCELLING"
                ? "Cancelación en proceso. Consulta hasta la confirmación del cierre comercial."
                : "Cancelación confirmada; consulta el reembolso del alquiler.",
            )
          }
        />
      )}
    </div>
  );
}
function RentalAssignment({
  rental,
  context,
  userId,
  branchId,
  onSaved,
}: {
  rental: RentalContract;
  context: Context;
  userId: number;
  branchId?: number;
  onSaved: () => void;
}) {
  const outboundLeg = rental.legs.find((l) => l.legType === "OUTBOUND"),
    returnLeg = rental.legs.find((l) => l.legType === "RETURN");
  // Arranca con lo que ya está asignado para poder confirmar o cambiar sin volver a elegir todo.
  const [outbound, setOutbound] = useState<{
      busId: number;
      driverId: number;
      driverBaseSalary?: number;
    }>({ busId: outboundLeg?.busId ?? 0, driverId: outboundLeg?.driverId ?? 0 }),
    [back, setBack] = useState<{ busId: number; driverId: number; driverBaseSalary?: number }>({
      busId: returnLeg?.busId ?? 0,
      driverId: returnLeg?.driverId ?? 0,
    });
  const hasReturn = !!returnLeg,
    assigned = rental.legs.every((l) => l.busId != null && l.driverId != null),
    query = branchId ? `?branchId=${branchId}` : "";
  const quote = useCustomerData(
    `/api/rentals/quotes/${rental.quoteId}${query}`,
    V.RentalQuoteSchema,
  );
  return (
    <details>
      <summary className="cursor-pointer underline">
        {assigned ? "Cambiar recursos asignados" : "Asignar recursos después del pago"}
      </summary>
      <div className="mt-4 space-y-5">
        <CustomerDataState loading={quote.loading} error={quote.error} retry={quote.refresh} />
        {quote.data && (
          <>
            <LegResources
              label="Ida"
              busTypeId={quote.data.busTypeId}
              context={context}
              {...(branchId ? { branchId } : {})}
              {...(outboundLeg ? { leg: outboundLeg } : {})}
              onChange={setOutbound}
            />
            {returnLeg && (
              <LegResources
                label="Retorno"
                busTypeId={quote.data.busTypeId}
                context={context}
                {...(branchId ? { branchId } : {})}
                leg={returnLeg}
                onChange={setBack}
              />
            )}
            <OperationForm
              monetary={false}
              scope={`rental-assign:${userId}:${rental.rentalId}`}
              path={`/api/rentals/contracts/${rental.rentalId}/assign${query}`}
              fields={[]}
              base={{ outbound, ...(hasReturn ? { return: back } : {}) }}
              schema={V.RentalAssignSchema}
              resultSchema={V.RentalContractSchema}
              label={assigned ? "Actualizar asignación" : "Confirmar asignación de tramos"}
              onSaved={onSaved}
            />
          </>
        )}
      </div>
    </details>
  );
}
/** Placa y nombre del chofer de un tramo, leídos de Fleet; si no se pueden leer, muestra los IDs. */
function LegResourceNames({
  branchId,
  busId,
  driverId,
}: {
  branchId: number;
  busId: number | null;
  driverId: number | null;
}) {
  const resources = useCustomerData(`/api/rentals/resources?branchId=${branchId}`, resourceSchema);
  const bus = resources.data?.buses.find((b) => b.id === busId),
    driver = resources.data?.drivers.find((d) => d.id === driverId);
  return (
    <>
      Bus {bus ? bus.plateNumber : (busId ?? "sin asignar")} · Chofer{" "}
      {driver ? `${driver.name} ${driver.lastName}` : (driverId ?? "sin asignar")}
    </>
  );
}
function LegResources({
  label,
  busTypeId,
  context,
  branchId,
  leg,
  onChange,
}: {
  label: string;
  busTypeId: number;
  context: Context;
  branchId?: number;
  /** Tramo actual: sus recursos ya asignados quedan preseleccionados. */
  leg?: RentalContract["legs"][number];
  onChange: (value: { busId: number; driverId: number; driverBaseSalary?: number }) => void;
}) {
  const [selectedBranch, setSelectedBranch] = useState(
      branchId ?? leg?.operatingBranchId ?? context.branches.find((b) => b.active)?.id ?? 0,
    ),
    [bus, setBus] = useState(leg?.busId ?? 0),
    [driver, setDriver] = useState(leg?.driverId ?? 0),
    [salary, setSalary] = useState("");
  // Solo la sucursal original conserva los recursos asignados como opción aunque ya no pasen el filtro.
  const keepBus = selectedBranch === leg?.operatingBranchId ? leg?.busId : null,
    keepDriver = selectedBranch === leg?.operatingBranchId ? leg?.driverId : null;
  const resources = useCustomerData(
    `/api/rentals/resources?branchId=${selectedBranch}`,
    resourceSchema,
  );
  function update(busId: number, driverId: number, base: string) {
    onChange({ busId, driverId, ...(base.trim() ? { driverBaseSalary: Number(base) } : {}) });
  }
  const choiceClass =
    "h-12 w-full rounded-lg border border-[var(--tg-line)] bg-[var(--tg-paper)] px-3";
  return (
    <fieldset className="grid gap-4 rounded-xl border border-[var(--tg-line)] p-4 sm:grid-cols-2">
      <legend className="font-semibold">Recursos de {label}</legend>
      {!branchId && (
        <label>
          Sucursal de los recursos
          <select
            className={choiceClass}
            value={selectedBranch}
            aria-label="Sucursal de los recursos"
            onChange={(e) => {
              setSelectedBranch(Number(e.target.value));
              setBus(0);
              setDriver(0);
              update(0, 0, salary);
            }}
          >
            {context.branches
              .filter((b) => b.active === true)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <CustomerDataState
        loading={resources.loading}
        error={resources.error}
        retry={resources.refresh}
      />
      <label>
        Bus
        <select
          className={choiceClass}
          value={bus}
          aria-label="Bus"
          onChange={(e) => {
            const id = Number(e.target.value),
              chosen = resources.data?.buses.find((b) => b.id === id),
              type = context.busTypes.find((t) => t.id === chosen?.busTypeId),
              amount =
                type?.suggestedDriverSalaryPerTrip == null
                  ? ""
                  : String(type.suggestedDriverSalaryPerTrip);
            setBus(id);
            setSalary(amount);
            update(id, driver, amount);
          }}
        >
          <option value={0}>Selecciona un bus</option>
          {resources.data?.buses
            .filter(
              (b) =>
                b.id === keepBus ||
                (b.busTypeId === busTypeId &&
                  b.rentalEnabled &&
                  busAvailability(b).active === true),
            )
            .map((b) => (
              <option value={b.id} key={b.id}>
                {b.plateNumber} · tipo #{b.busTypeId}
              </option>
            ))}
        </select>
      </label>
      <label>
        Chofer
        <select
          className={choiceClass}
          value={driver}
          aria-label="Chofer"
          onChange={(e) => {
            setDriver(Number(e.target.value));
            update(bus, Number(e.target.value), salary);
          }}
        >
          <option value={0}>Selecciona un chofer</option>
          {resources.data?.drivers
            .filter((d) => d.id === keepDriver || driverAvailability(d).active === true)
            .map((d) => (
              <option value={d.id} key={d.id}>
                {d.name} {d.lastName}
              </option>
            ))}
        </select>
      </label>
      <div className="space-y-2">
        <Label htmlFor={`rental-salary-${label}`}>Salario base de {label} (Q, opcional)</Label>
        {leg?.busId != null && (
          <p className="text-sm">Si lo dejas vacío se usa el salario aprobado en la cotización.</p>
        )}
        <Input
          id={`rental-salary-${label}`}
          type="number"
          min={0}
          value={salary}
          onChange={(e) => {
            setSalary(e.target.value);
            update(bus, driver, e.target.value);
          }}
        />
      </div>
    </fieldset>
  );
}
