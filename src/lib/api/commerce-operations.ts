import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as V from "@/lib/validators/commerce";
import { ManagedBranchIdSchema as id } from "@/lib/validators/branch-context";
import { BranchSchema } from "@/lib/validators/branch";
import { TripOffersSchema } from "@/lib/validators/journey";
import { BusListSchema } from "@/lib/validators/fleet-resources";
import { operationsAccess } from "./operations-access";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "./transport-service";
import { adminErrorResponse } from "./admin";
import { ApplicationError } from "@/types/error";
import type { TransportRoleName } from "@/types/auth";
import type { CommerceReceipt, SeatCell } from "@/types/commerce";
type Access = Awaited<ReturnType<typeof operationsAccess>>;
const POS: TransportRoleName[] = ["CAJERO", "SUCURSAL_ADMIN"],
  CUSTOMER: TransportRoleName[] = ["CUSTOMER"],
  BUYERS: TransportRoleName[] = [...POS, ...CUSTOMER];
function fail(detail: string, status = 403): never {
  throw new ApplicationError(
    status === 403 ? "auth.forbidden" : "validation.failed",
    status,
    detail,
  );
}
const parseId = (value: string | undefined) => checkedBody(id, Number(value));
async function input<T>(request: NextRequest, schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  return checkedBody(schema, await request.json().catch(() => null));
}
async function command(
  request: NextRequest,
  path: string,
  access: Access,
  body: unknown,
  method: "POST" | "PATCH" | "PUT" = "POST",
) {
  const key = checkedBody(V.OperationKeySchema, request.headers.get("Idempotency-Key"));
  return transportService(path, { ...access, method, body, idempotencyKey: key });
}
export async function ownInvoices(access: Access) {
  const invoices = serviceResult(
    V.PurchaseResponseSchema.array(),
    await transportService("payments/me", access),
  ).map((purchase) => purchase.invoice);
  if (
    invoices.some(
      (i) =>
        i.customerNit.toUpperCase() === "CF" ||
        (access.user.customerId != null && i.customerId !== access.user.customerId) ||
        (access.user.nit != null && i.customerNit !== access.user.nit),
    )
  )
    fail("Las facturas no corresponden al Customer personal de tu cuenta.");
  return invoices;
}
export async function authorizedReceipt(
  invoiceId: number,
  access: Access,
): Promise<CommerceReceipt> {
  if (
    access.user.role.name === "CUSTOMER" &&
    !(await ownInvoices(access)).some((i) => i.invoiceId === invoiceId)
  )
    fail("La factura no corresponde a tu cuenta.");
  const result = serviceResult(
    V.PurchaseResponseSchema,
    await transportService(`payments/${invoiceId}/tickets`, access),
  );
  if (result.invoice.invoiceId !== invoiceId)
    fail("No se pudo verificar la factura solicitada.", 502);
  if (access.user.role.name === "CUSTOMER") {
    if (
      result.invoice.customerNit.toUpperCase() === "CF" ||
      (access.user.customerId != null && result.invoice.customerId !== access.user.customerId) ||
      (access.user.nit != null && result.invoice.customerNit !== access.user.nit)
    )
      fail("La factura no corresponde a tu identidad comercial.");
  } else if (
    access.user.role.name !== "ADMIN" &&
    result.invoice.sourceBranchId !== access.branchId &&
    result.invoice.revenueBranchId !== access.branchId
  )
    fail("La factura no pertenece al ámbito de tu sucursal.");
  return result;
}
async function ownedRefund(refundId: number, access: Access, code?: string) {
  if (access.user.role.name === "CUSTOMER") {
    const list = serviceResult(
      V.RefundSchema.array(),
      await transportService("refunds/me", access),
    );
    if (!list.some((r) => r.refundId === refundId))
      fail("El reembolso no corresponde a tu cuenta.");
  } else {
    if (!code) fail("Presenta el código exacto del comprobante.", 400);
    const claim = serviceResult(
      V.RefundClaimSchema,
      await transportService(`refunds/claim?${new URLSearchParams({ code })}`, access),
    );
    if (
      claim.refundId !== refundId ||
      claim.refundCode !== code ||
      claim.operationBranchId !== access.branchId
    )
      fail("El código no corresponde al reembolso.");
  }
  // El staff presenta el mismo código: Commerce lo admite desde su sede operativa aunque la venta sea de otra sede.
  const refund = serviceResult(
    V.RefundSchema,
    await transportService(
      access.user.role.name === "CUSTOMER" || !code
        ? `refunds/${refundId}`
        : `refunds/${refundId}?${new URLSearchParams({ code })}`,
      access,
    ),
  );
  if (refund.refundId !== refundId) fail("La respuesta no corresponde al reembolso.", 502);
  return refund;
}
async function restrictionScope(scopeType: "BUS" | "TRIP", scopeId: number, access: Access) {
  if (scopeType === "BUS") {
    if (access.user.role.name !== "SUCURSAL_ADMIN")
      fail("Solo administración de sucursal gestiona restricciones de bus.");
    const buses = serviceResult(
      BusListSchema,
      await transportService(`branches/${access.branchId}/buses`, access),
    );
    if (!buses.some((b) => b.id === scopeId)) fail("El bus no pertenece a la sucursal.");
  } else {
    const trips = serviceResult(
      TripOffersSchema,
      await transportService(`trips?originBranchId=${access.branchId}`),
    );
    if (!trips.some((trip) => trip.tripId === scopeId && trip.originBranchId === access.branchId))
      fail("El viaje no pertenece a la sucursal.");
  }
}
export async function commerceOperation(request: NextRequest, segments: string[]) {
  try {
    const path = segments.join("/"),
      method = request.method;
    if (method !== "GET") requireSameOrigin(request);
    if (path === "context" && method === "GET") {
      const a = await operationsAccess(request, POS, true);
      const branchName =
        a.branchName ??
        serviceResult(BranchSchema, await transportService(`branches/${a.branchId}`, a)).name;
      return NextResponse.json({
        userId: a.user.id,
        branchId: a.branchId,
        branchName,
        canManageCapital: a.user.role.name === "SUCURSAL_ADMIN",
      });
    }
    if (path === "wallet" && method === "GET") {
      const a = await operationsAccess(request, CUSTOMER);
      const [wallet, transactions] = await Promise.all([
        transportService("wallets/me", a),
        transportService("wallets/me/transactions", a),
      ]);
      return NextResponse.json({
        wallet: serviceResult(V.CommerceWalletSchema, wallet),
        transactions: serviceResult(V.WalletTransactionResponseSchema.array(), transactions),
      });
    }
    if (path === "wallet/recharges" && method === "POST") {
      const a = await operationsAccess(request, CUSTOMER),
        body = await input(request, V.RechargeInputSchema);
      return NextResponse.json(
        serviceResult(
          V.WalletRechargeSchema,
          await command(request, "wallets/me/recharges", a, body),
        ),
        { status: 201 },
      );
    }
    if (path === "invoices/mine" && method === "GET")
      return NextResponse.json(await ownInvoices(await operationsAccess(request, CUSTOMER)));
    if (segments[0] === "invoices" && segments.length === 2 && method === "GET")
      return NextResponse.json(
        await authorizedReceipt(
          parseId(segments[1]),
          await operationsAccess(request, [...BUYERS, "ADMIN"], true),
        ),
      );
    if (path === "restrictions/context" && method === "GET") {
      const a = await operationsAccess(request, POS, true),
        trips = serviceResult(
          TripOffersSchema,
          await transportService(`trips?originBranchId=${a.branchId}`),
        );
      if (trips.some((t) => t.originBranchId !== a.branchId))
        fail("Los viajes no corresponden a la sucursal.");
      const buses =
        a.user.role.name === "SUCURSAL_ADMIN"
          ? serviceResult(BusListSchema, await transportService(`branches/${a.branchId}/buses`, a))
          : [];
      return NextResponse.json({
        trips: trips.map(({ tripId, departureAt }) => ({ tripId, departureAt })),
        buses,
      });
    }
    if (segments[0] === "seats" && segments.length === 2 && method === "GET") {
      const a = await operationsAccess(request, BUYERS, true),
        tripId = parseId(segments[1]);
      const map = serviceResult(
        V.SeatMapResponseSchema,
        await transportService(`seats/trips/${tripId}`, a),
      );
      if (map.tripId !== tripId) fail("No se pudo confirmar el mapa del viaje.", 502);
      return NextResponse.json(map);
    }
    if (
      segments[0] === "seats" &&
      segments.length === 3 &&
      segments[2] === "holds" &&
      method === "POST"
    ) {
      const a = await operationsAccess(request, BUYERS, true),
        tripId = parseId(segments[1]),
        body = await input(request, V.HoldInputSchema);
      const map = serviceResult(
        V.SeatMapResponseSchema,
        await transportService(`seats/trips/${tripId}`, a),
      );
      if (
        map.tripId !== tripId ||
        body.seats.some(
          (s) =>
            !map.seats.some(
              (c: SeatCell) => c.row === s.row && c.column === s.column && c.state === "AVAILABLE",
            ),
        )
      )
        fail("Algún asiento dejó de estar disponible. Actualiza el mapa.", 409);
      return NextResponse.json(
        serviceResult(V.HoldSchema, await command(request, `seats/trips/${tripId}/holds`, a, body)),
        { status: 201 },
      );
    }
    if (["payments/tickets", "payments/counter"].includes(path) && method === "POST") {
      const counter = path.endsWith("counter"),
        a = await operationsAccess(request, counter ? POS : CUSTOMER, counter);
      if (counter) {
        const body = await input(request, V.CounterPaymentInputSchema);
        if (body.nit.toUpperCase() !== "CF") {
          const customer = serviceResult(
            V.PosCustomerSchema,
            await transportService(`customers/by-nit/${encodeURIComponent(body.nit)}`, a),
          );
          if (customer.nit !== body.nit) fail("No se pudo verificar el NIT.", 502);
          if (customer.hasUser && body.contactEmail !== undefined)
            fail("No puedes sustituir el correo de una cuenta registrada.", 400);
        }
        const result = serviceResult(
          V.CounterPaymentSchema,
          await command(request, "payments/counter", a, body),
        );
        if (
          result.sourceBranchId !== a.branchId ||
          result.revenueBranchId !== a.branchId ||
          result.sellerUserId !== a.user.id ||
          result.paymentDate !== body.paymentDate
        )
          fail(
            "No se pudo confirmar la sucursal o el vendedor del cobro. Consulta la factura.",
            502,
          );
        return NextResponse.json(result, { status: 201 });
      }
      const body = await input(request, V.TicketPaymentInputSchema);
      return NextResponse.json(
        serviceResult(V.TicketPaymentSchema, await command(request, "payments/tickets", a, body)),
        { status: 201 },
      );
    }
    if (path === "customers/search" && method === "GET") {
      const a = await operationsAccess(request, POS, true),
        prefix = checkedBody(
          z.string().trim().min(3).max(50),
          request.nextUrl.searchParams.get("nitPrefix"),
        );
      return NextResponse.json(
        serviceResult(
          V.CustomerSuggestionSchema.array().max(20),
          await transportService(
            `customers/search?${new URLSearchParams({ nitPrefix: prefix })}`,
            a,
          ),
        ),
      );
    }
    if (
      segments[0] === "customers" &&
      segments[1] === "by-nit" &&
      segments.length === 3 &&
      method === "GET"
    ) {
      const a = await operationsAccess(request, POS, true),
        nit = checkedBody(z.string().min(1).max(50), segments[2]);
      const customer = serviceResult(
        V.PosCustomerSchema,
        await transportService(`customers/by-nit/${encodeURIComponent(nit)}`, a),
      );
      if (customer.nit !== nit) fail("El resultado no coincide con el NIT.", 502);
      return NextResponse.json(customer);
    }
    if (path === "customers/counter" && method === "POST") {
      const a = await operationsAccess(request, POS, true),
        body = await input(request, V.CounterCustomerInputSchema);
      const result = serviceResult(
        V.PosCustomerSchema,
        await command(request, "customers/counter", a, body),
      );
      if (result.nit !== body.nit || result.hasUser)
        fail("No se pudo confirmar el comprador sin cuenta.", 502);
      return NextResponse.json(result, { status: 201 });
    }
    if (
      segments[0] === "customers" &&
      segments[2] === "contact" &&
      segments.length === 3 &&
      method === "PATCH"
    ) {
      const a = await operationsAccess(request, POS, true),
        body = await input(request, V.ContactInputSchema),
        customerId = parseId(segments[1]);
      const nit = checkedBody(z.string().min(1).max(50), request.nextUrl.searchParams.get("nit"));
      const customer = serviceResult(
        V.PosCustomerSchema,
        await transportService(`customers/by-nit/${encodeURIComponent(nit)}`, a),
      );
      if (customer.customerId !== customerId || customer.hasUser)
        fail("Solo se puede actualizar el contacto del comprador sin User.");
      const updated = serviceResult(
        V.PosCustomerSchema,
        await command(request, `customers/${customerId}/contact`, a, body, "PATCH"),
      );
      if (updated.customerId !== customerId || updated.nit !== nit || updated.hasUser)
        fail("No se pudo confirmar el contacto del comprador.", 502);
      return NextResponse.json(updated);
    }
    if (path === "cash" && method === "GET") {
      const a = await operationsAccess(request, POS, true),
        cash = serviceResult(
          V.CashAccountSchema,
          await transportService(`cash/branches/${a.branchId}`, a),
        );
      if (cash.branchId !== a.branchId) fail("La caja no corresponde a tu sucursal.", 502);
      return NextResponse.json(cash);
    }
    if (path === "cash/movements" && method === "GET") {
      const a = await operationsAccess(request, POS, true),
        range = checkedBody(
          V.DateRangeSchema,
          Object.fromEntries([...request.nextUrl.searchParams].filter(([k]) => k !== "branchId")),
        );
      return NextResponse.json(
        serviceResult(
          V.CashHistorySchema,
          await transportService(
            `cash/branches/${a.branchId}/movements?${new URLSearchParams(Object.entries(range).filter((entry): entry is [string, string] => entry[1] !== undefined))}`,
            a,
          ),
        ),
      );
    }
    if (["cash/open", "cash/capital-movements"].includes(path) && method === "POST") {
      const a = await operationsAccess(request, ["SUCURSAL_ADMIN"], true),
        opening = path.endsWith("open");
      const body = opening
        ? await input(request, V.CashOpeningSchema)
        : await input(request, V.CapitalInputSchema);
      const cash = serviceResult(
        V.CashAccountSchema,
        await command(
          request,
          `cash/branches/${a.branchId}/${opening ? "open" : "capital-movements"}`,
          a,
          body,
        ),
      );
      if (cash.branchId !== a.branchId || cash.initializedAt === null)
        fail("No se pudo confirmar la operación en la caja.", 502);
      return NextResponse.json(cash);
    }
    if (path === "refunds/mine" && method === "GET")
      return NextResponse.json(
        serviceResult(
          V.RefundSchema.array(),
          await transportService("refunds/me", await operationsAccess(request, CUSTOMER)),
        ),
      );
    if (path === "refunds/claim" && method === "GET") {
      const a = await operationsAccess(request, POS, true),
        code = checkedBody(
          z.string().trim().min(1).max(48),
          request.nextUrl.searchParams.get("code"),
        );
      const refund = serviceResult(
        V.RefundClaimSchema,
        await transportService(`refunds/claim?${new URLSearchParams({ code })}`, a),
      );
      if (refund.refundCode !== code || refund.operationBranchId !== a.branchId)
        fail("El comprobante no coincide con la sucursal operativa.", 502);
      return NextResponse.json(refund);
    }
    if (segments[0] === "refunds" && segments.length === 2 && method === "GET") {
      const a = await operationsAccess(request, BUYERS, true);
      return NextResponse.json(
        await ownedRefund(
          parseId(segments[1]),
          a,
          request.nextUrl.searchParams.get("code") ?? undefined,
        ),
      );
    }
    if (
      segments[0] === "refunds" &&
      segments.length === 3 &&
      ["settle-wallet", "settle-cash"].includes(segments[2] ?? "") &&
      method === "POST"
    ) {
      const cash = segments[2] === "settle-cash",
        a = await operationsAccess(request, cash ? ["CAJERO"] : CUSTOMER, cash),
        refundId = parseId(segments[1]);
      const body = cash
        ? await input(
            request,
            V.CashSettleInputSchema.extend({ code: z.string().min(1).max(48) }).strict(),
          )
        : await input(request, z.object({}).strict());
      const refund = await ownedRefund(
        refundId,
        a,
        "code" in body && typeof body.code === "string" ? body.code : undefined,
      );
      // El proveedor resuelve primero idempotencia; repetir una misma llave sigue siendo seguro.
      const result = serviceResult(
        V.RefundSchema,
        await command(
          request,
          `refunds/${refundId}/${segments[2]}`,
          a,
          // branchId sale del contexto verificado de sesión, nunca de un campo libre del cliente.
          cash ? { branchId: a.branchId, delivered: true } : {},
        ),
      );
      if (
        result.refundId !== refundId ||
        result.amount !== refund.amount ||
        result.status !== "COMPLETED" ||
        result.method !== (cash ? "CASH" : "WALLET") ||
        (cash &&
          (result.paidBranchId !== a.branchId ||
            (result.processedByUserId != null && result.processedByUserId !== a.user.id)))
      )
        fail("No se pudo confirmar la liquidación. Consulta el reembolso antes de repetirla.", 502);
      return NextResponse.json(result);
    }
    if (path === "policy" && ["GET", "PUT"].includes(method)) {
      const a = await operationsAccess(
        request,
        method === "PUT" ? ["ADMIN"] : ["ADMIN", ...BUYERS],
      );
      const result =
        method === "GET"
          ? await transportService("cancellation-policy", a)
          : await command(
              request,
              "cancellation-policy",
              a,
              await input(request, V.CancellationPolicySchema),
              "PUT",
            );
      return NextResponse.json(serviceResult(V.CancellationPolicySchema, result));
    }
    if (
      segments[0] === "invoices" &&
      segments[2] === "tickets" &&
      segments.length === 5 &&
      ["cancel", "reassign"].includes(segments[4] ?? "") &&
      method === "POST"
    ) {
      const cancel = segments[4] === "cancel",
        a = await operationsAccess(request, cancel ? BUYERS : POS, true),
        invoiceId = parseId(segments[1]),
        ticketId = parseId(segments[3]);
      const receipt = await authorizedReceipt(invoiceId, a),
        ticket = receipt.tickets.find((t) => t.ticketId === ticketId);
      if (!ticket) fail("El boleto no pertenece a esta factura.", 404);
      if (cancel) {
        if (!ticket.cancellationPreview?.eligible)
          fail(
            ticket.cancellationPreview?.reason ??
              "El servicio debe informar el importe exacto antes de confirmar la cancelación.",
            422,
          );
        const body = await input(request, V.TicketCancelInputSchema);
        if (a.user.role.name === "SUCURSAL_ADMIN" && !body.reason?.trim())
          fail("La cancelación excepcional necesita un motivo.", 400);
        const result = serviceResult(
          V.TicketCancellationSchema,
          await command(request, `tickets/${ticketId}/cancel`, a, body),
        );
        if (result.ticketId !== ticketId || result.amount !== ticket.cancellationPreview.amount)
          fail("No se pudo confirmar la cancelación del boleto.", 502);
        return NextResponse.json(result);
      }
      const body = await input(request, V.ReassignInputSchema),
        result = serviceResult(
          V.ReassignResultSchema,
          await command(request, `tickets/${ticketId}/reassign`, a, body),
        );
      if (
        result.ticketId !== ticketId ||
        result.seatRow !== body.seatRow ||
        result.seatColumn !== body.seatColumn
      )
        fail("No se pudo confirmar el asiento vigente.", 502);
      return NextResponse.json(result);
    }
    if (path === "restrictions" && method === "POST") {
      const a = await operationsAccess(request, POS, true),
        body = await input(request, V.RestrictionInputSchema);
      await restrictionScope(body.scopeType, body.scopeId, a);
      const result = serviceResult(
        V.RestrictionResultSchema,
        await command(request, "seats/restrictions", a, body),
      );
      if (!result.isActive) fail("No se pudo confirmar el bloqueo.", 502);
      return NextResponse.json(result, { status: 201 });
    }
    if (
      segments[0] === "restrictions" &&
      segments[2] === "deactivate" &&
      segments.length === 3 &&
      method === "PATCH"
    ) {
      const a = await operationsAccess(request, POS, true),
        restrictionId = parseId(segments[1]),
        body = await input(
          request,
          V.RestrictionInputSchema.pick({ scopeType: true, scopeId: true }).strict(),
        );
      await restrictionScope(body.scopeType, body.scopeId, a);
      const result = serviceResult(
        V.RestrictionResultSchema,
        await command(request, `seats/restrictions/${restrictionId}/deactivate`, a, {}, "PATCH"),
      );
      if (result.restrictionId !== restrictionId || result.isActive)
        fail("No se pudo confirmar el desbloqueo.", 502);
      return NextResponse.json(result);
    }
    fail("Operación no disponible.", 404);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
