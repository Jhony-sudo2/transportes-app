import { NextRequest, NextResponse } from "next/server";
import { requireCustomerAccess, getCustomerInvoice, commerceRequest } from "@/lib/api/commerce";
import { adminErrorResponse } from "@/lib/api/admin";
import { CommerceIdSchema, CustomerCancellationSchema } from "@/lib/validators/customer-commerce";
import { ApplicationError } from "@/types/error";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const access = await requireCustomerAccess();
    const id = CommerceIdSchema.safeParse(Number((await context.params).id));
    if (!id.success) throw new ApplicationError("validation.failed", 400, "Factura inválida.");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = CustomerCancellationSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        "Selecciona tickets válidos o cancela todos los vigentes.",
      );
    const { invoice, tickets } = await getCustomerInvoice(id.data, access);
    if (invoice.state !== "PAID" || invoice.typeInvoice !== "TICKET_PAYMENT")
      throw new ApplicationError(
        "validation.failed",
        409,
        "Esta factura no tiene tickets que puedan cancelarse.",
      );
    const activeIds = new Set(
      tickets.filter((ticket) => ticket.state === "PAID").map((ticket) => ticket.id),
    );
    if (
      !activeIds.size ||
      (parsed.data.scope === "invoice" && tickets.some((ticket) => !ticket.state)) ||
      (parsed.data.scope === "tickets" &&
        parsed.data.tickets.some((ticketId) => !activeIds.has(ticketId)))
    )
      throw new ApplicationError(
        "validation.failed",
        409,
        "Algún ticket ya no está vigente o no pertenece a esta factura. Actualiza los datos.",
      );
    await commerceRequest(
      "cancellations/" + (parsed.data.scope === "invoice" ? "invoices" : "tickets"),
      access.token,
      parsed.data.scope === "invoice" ? { invoiceId: id.data } : { tickets: parsed.data.tickets },
      "cancellation",
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
