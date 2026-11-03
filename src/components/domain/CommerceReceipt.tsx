"use client";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useCustomerData } from "@/hooks/useCustomerData";
import {
  ReceiptSchema,
  CancellationPolicySchema,
  TicketCancelInputSchema,
  TicketCancellationSchema,
  ReassignInputSchema,
  ReassignResultSchema,
} from "@/lib/validators/commerce";
import { OperationForm } from "./OperationForm";
import { CustomerDataState } from "./CustomerDataState";
import { Button } from "@/components/ui/button";
import { cancellationReasonMessage } from "@/lib/commerce-ui";
export function CommerceReceipt({
  invoiceId,
  userId,
  role,
  branchId,
}: {
  invoiceId: number;
  userId: number;
  role: string;
  branchId?: number;
}) {
  const query = branchId ? `?branchId=${branchId}` : "",
    resource = useCustomerData(`/api/commerce/invoices/${invoiceId}${query}`, ReceiptSchema),
    policy = useCustomerData("/api/commerce/policy", CancellationPolicySchema),
    [notice, setNotice] = useState("");
  const invoice = resource.data?.invoice;
  return (
    <div className="commerce-receipt space-y-6">
      <CustomerDataState
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      />
      {notice && (
        <p role="status" className="tg-notice print:hidden">
          {notice}
        </p>
      )}
      {invoice && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold">Factura #{invoice.invoiceId}</h1>
            <Button className="print:hidden" onClick={() => window.print()}>
              Imprimir comprobante / Guardar PDF
            </Button>
          </div>
          <section className="rounded-2xl border border-[var(--tg-line)] p-6">
            <h2 className="text-xl font-semibold">Transportes Guatemala</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["Cliente", invoice.customerName],
                ["NIT", invoice.customerNit],
                ["Fecha de pago", invoice.paymentDate],
                ["Canal", invoice.channel === "WEB" ? "En línea" : "Presencial"],
                [
                  "Sucursal de compra",
                  invoice.sourceBranchId ? `#${invoice.sourceBranchId}` : "Compra web",
                ],
                ["Sucursal comercial", `#${invoice.revenueBranchId}`],
                [
                  "Vendedor",
                  invoice.channel === "WEB"
                    ? "En línea"
                    : invoice.sellerUserId
                      ? `#${invoice.sellerUserId}`
                      : "No informado por el servicio",
                ],
                ...(invoice.state
                  ? [["Estado", invoice.state === "PAID" ? "Pagada" : "Cancelada"]]
                  : []),
                ["Total original", `Q${invoice.totalAmount.toFixed(2)}`],
                ...(invoice.contactEmailStatus
                  ? [["Correo del comprobante", invoice.contactEmailStatus]]
                  : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[var(--tg-muted)]">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {invoice.refundedAmount != null && (
              <p className="mt-4 text-sm">
                Importe de devoluciones reportado: Q{invoice.refundedAmount.toFixed(2)}. Consulta
                cada reembolso para conocer su liquidación.
              </p>
            )}
          </section>
          <section className="space-y-5">
            <h2 className="text-xl font-semibold">Boletos y asientos vigentes</h2>
            {resource.data?.tickets.map((ticket) => (
              <article
                key={ticket.ticketId}
                className="space-y-4 rounded-xl border border-[var(--tg-line)] p-5"
              >
                <h3 className="font-semibold">
                  Boleto #{ticket.ticketId} · Viaje #{ticket.tripId}
                </h3>
                <p>
                  Fila {ticket.seatRow}, asiento {ticket.seatColumn} · Q{ticket.amount.toFixed(2)} ·{" "}
                  {ticket.cancelled ? "Cancelado" : "Vigente"}
                </p>
                {!ticket.cancelled && role !== "ADMIN" && (
                  <div className="space-y-4 print:hidden">
                    <details>
                      <summary className="cursor-pointer underline">
                        {role === "SUCURSAL_ADMIN"
                          ? "Cancelación excepcional autorizada"
                          : "Cancelar este boleto"}
                      </summary>
                      <div className="mt-4 space-y-3">
                        {ticket.cancellationPreview ? (
                          <p className="tg-notice">
                            {ticket.cancellationPreview.eligible
                              ? `Importe exacto informado para cancelar: Q${ticket.cancellationPreview.amount.toFixed(2)} (${ticket.cancellationPreview.appliedPercent}%). Se reconocerá como pendiente de cobro.`
                              : cancellationReasonMessage(ticket.cancellationPreview.reason)}
                          </p>
                        ) : (
                          <p role="status">
                            El servicio aún no informó el importe exacto de cancelación. Actualiza
                            el comprobante antes de confirmar.
                          </p>
                        )}
                        {policy.data ? (
                          <p>
                            Cancelación voluntaria: porcentaje vigente{" "}
                            {policy.data.voluntaryRefundPercent}%, corte {policy.data.cutoffMinutes}{" "}
                            minutos. El servicio confirma el derecho y monto exacto; el dinero se
                            cobra después como reembolso.
                          </p>
                        ) : (
                          <CustomerDataState
                            loading={policy.loading}
                            error={policy.error}
                            retry={policy.refresh}
                          />
                        )}
                        {ticket.cancellationPreview?.eligible && (
                          <OperationForm
                            scope={`ticket-cancel:${userId}:${ticket.ticketId}`}
                            path={`/api/commerce/invoices/${invoiceId}/tickets/${ticket.ticketId}/cancel${query}`}
                            schema={
                              role === "SUCURSAL_ADMIN"
                                ? TicketCancelInputSchema.extend({
                                    reason: z.string().trim().min(1).max(500),
                                  })
                                : TicketCancelInputSchema
                            }
                            resultSchema={TicketCancellationSchema}
                            fields={[
                              {
                                name: "reason",
                                label: "Motivo de cancelación",
                                type: "textarea",
                                optional: role !== "SUCURSAL_ADMIN",
                              },
                            ]}
                            label="Confirmar cancelación individual"
                            confirmation="Entiendo que se cancelará este boleto y se reconocerá un reembolso pendiente; no se abonará automáticamente."
                            onSaved={(r) => {
                              setNotice(
                                `Boleto cancelado. Reembolso #${r.refundId}: Q${r.amount.toFixed(2)}, pendiente de cobro.`,
                              );
                              resource.refresh();
                            }}
                          />
                        )}
                      </div>
                    </details>
                    {role !== "CUSTOMER" && (
                      <details>
                        <summary className="cursor-pointer underline">Reasignar asiento</summary>
                        <div className="mt-4">
                          <OperationForm
                            scope={`ticket-seat:${userId}:${ticket.ticketId}`}
                            path={`/api/commerce/invoices/${invoiceId}/tickets/${ticket.ticketId}/reassign${query}`}
                            schema={ReassignInputSchema}
                            resultSchema={ReassignResultSchema}
                            fields={[
                              {
                                name: "seatRow",
                                label: "Nueva fila",
                                type: "number",
                                min: 1,
                                step: "1",
                              },
                              {
                                name: "seatColumn",
                                label: "Nuevo asiento",
                                type: "number",
                                min: 1,
                                step: "1",
                              },
                            ]}
                            label="Confirmar asiento nuevo"
                            onSaved={() => {
                              setNotice(
                                "Asiento actualizado. Se conserva el mismo boleto y factura.",
                              );
                              resource.refresh();
                            }}
                          />
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </article>
            ))}
            {resource.data?.tickets.length === 0 && (
              <p>Esta factura no contiene boletos individuales.</p>
            )}
          </section>
          {role !== "ADMIN" && role !== "SUCURSAL_ADMIN" && (
            <Link
              className="underline print:hidden"
              href={role === "CUSTOMER" ? "/customer/refunds" : "/cashier/refunds"}
            >
              Consultar reembolsos
            </Link>
          )}
        </>
      )}
      <style jsx global>{`
        @media print {
          body:has(.commerce-receipt) header,
          body:has(.commerce-receipt) footer {
            display: none !important;
          }
          .commerce-receipt {
            color: #111;
            background: #fff;
          }
          .commerce-receipt article {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
