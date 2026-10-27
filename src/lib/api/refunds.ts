import "server-only";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getTransportSession } from "@/lib/auth/session";
import { ApplicationError } from "@/types/error";
import { adminErrorResponse } from "./admin";
import { commerceRequest, commerceResult, getCustomerInvoices } from "./commerce";
import { transportRequest } from "./iam";
import { fleetRequest } from "./fleet";
import { ManagedBranchChoiceSchema, ManagedBranchIdSchema } from "@/lib/validators/branch-context";
import {
  CustomerInvoiceSchema,
  CustomerTicketSchema,
  CustomerTransactionSchema,
} from "@/lib/validators/customer-commerce";
import { RefundRequestSchema, parseInvoiceId } from "@/lib/validators/refunds";

export type RefundActor = "customer" | "cashier";
export async function requireRefundAccess(actor: RefundActor) {
  const user = await getTransportSession();
  const token = (await cookies()).get("access_token")?.value;
  if (!user || !user.isActive || !token)
    throw new ApplicationError("auth.token_invalid", 401, "Inicia sesión para continuar.");
  if (user.resetPassword || user.role.name !== (actor === "customer" ? "CUSTOMER" : "CAJERO"))
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "Tu cuenta no tiene acceso a esta operación.",
    );
  let branchId: number | null = null;
  if (actor === "cashier") {
    const result = ManagedBranchIdSchema.array().safeParse(
      await transportRequest(`users/${user.id}/branches`, { token }),
    );
    if (!result.success)
      invalidResponse(
        "No se pudieron verificar las sucursales asignadas en el servicio de usuarios.",
      );
    branchId = result.data.length === 1 ? (result.data[0] ?? null) : null;
    if (branchId === null)
      throw new ApplicationError(
        "auth.forbidden",
        403,
        "Tu cuenta debe tener una única sucursal asignada. Contacta al administrador.",
      );
  }
  return { user, token, branchId };
}
type Access = Awaited<ReturnType<typeof requireRefundAccess>>;
function forbidden(detail: string): never {
  throw new ApplicationError("auth.forbidden", 403, detail);
}
function invalidResponse(detail: string): never {
  throw new ApplicationError("system.internal_error", 502, detail);
}
async function getInvoice(actor: RefundActor, id: number, access: Access) {
  const invoice = commerceResult(
    CustomerInvoiceSchema,
    await commerceRequest("payments/" + id, access.token),
  );
  if (invoice.id !== id) invalidResponse("No se pudo verificar la factura solicitada.");
  if (actor === "customer" && invoice.userId !== access.user.id)
    forbidden("La factura no corresponde a tu cuenta.");
  if (actor === "cashier" && invoice.branchId !== access.branchId)
    forbidden("La factura no corresponde a tu sucursal.");
  return invoice;
}
async function getDetail(actor: RefundActor, id: number, access: Access) {
  const invoice = await getInvoice(actor, id, access);
  const tickets = commerceResult(
    CustomerTicketSchema.array(),
    await commerceRequest("payments/" + id + "/tickets", access.token),
  );
  if (tickets.some((ticket) => ticket.invoiceId !== id))
    invalidResponse("Los tickets recibidos no corresponden a esta factura.");
  return { invoice, tickets };
}
async function getBranchInfo(id: number, token: string) {
  const result = ManagedBranchChoiceSchema.safeParse(await fleetRequest(`branches/${id}`, token));
  if (!result.success || result.data.id !== id)
    invalidResponse("Fleet no devolvió la sucursal solicitada.");
  return result.data;
}
export async function refundGet(actor: RefundActor, id?: string) {
  try {
    const access = await requireRefundAccess(actor);
    if (id !== undefined) {
      const parsed = parseInvoiceId(id);
      if (!parsed?.success)
        throw new ApplicationError("validation.failed", 400, "Número de factura inválido.");
      const detail = await getDetail(actor, parsed.data, access);
      const branch = await getBranchInfo(detail.invoice.branchId, access.token);
      return NextResponse.json({ ...detail, branchName: branch.name });
    }
    if (actor === "cashier") {
      if (access.branchId === null) forbidden("No tienes una sucursal asignada.");
      const branch = await getBranchInfo(access.branchId, access.token);
      return NextResponse.json({ branchId: branch.id, branchName: branch.name });
    }
    const invoices = await getCustomerInvoices(access);
    return NextResponse.json(
      invoices.filter((invoice) => ["CANCELLED", "REIMBURSED"].includes(invoice.state)),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
export async function refundPost(request: NextRequest, actor: RefundActor, id: string) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) forbidden("Origen no permitido.");
    const access = await requireRefundAccess(actor);
    const parsedId = parseInvoiceId(id);
    if (!parsedId?.success)
      throw new ApplicationError("validation.failed", 400, "Número de factura inválido.");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = RefundRequestSchema.safeParse(raw);
    if (!parsed.success || parsed.data.invoiceId !== parsedId.data)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Envía únicamente el número de esta factura.",
      );
    const invoice = await getInvoice(actor, parsedId.data, access);
    if (invoice.state !== "CANCELLED")
      throw new ApplicationError(
        "validation.failed",
        409,
        invoice.state === "REIMBURSED"
          ? "Esta factura ya fue reembolsada."
          : "La factura no tiene una devolución disponible.",
      );
    const transaction = commerceResult(
      CustomerTransactionSchema,
      await commerceRequest(
        "refunds/" + (actor === "customer" ? "web" : "in-person"),
        access.token,
        { invoiceId: parsedId.data },
        "refund",
      ),
    );
    if (transaction.transactionType !== "REFUND" || transaction.amount !== invoice.totalAmount)
      invalidResponse(
        "No se pudo confirmar la devolución. Actualiza la factura antes de continuar.",
      );
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
