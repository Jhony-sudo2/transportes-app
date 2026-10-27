import "server-only";
import { cookies } from "next/headers";
import type { z } from "zod";
import { getTransportSession } from "@/lib/auth/session";
import { ApplicationError } from "@/types/error";
import {
  CustomerWalletSchema,
  CustomerTransactionsSchema,
  CustomerInvoicesSchema,
  CustomerInvoiceSchema,
  CustomerTicketSchema,
} from "@/lib/validators/customer-commerce";

export async function requireCustomerAccess() {
  const user = await getTransportSession();
  const token = (await cookies()).get("access_token")?.value;
  if (!user || !user.isActive || !token)
    throw new ApplicationError(
      "auth.token_invalid",
      401,
      "Inicia sesión para consultar tu cuenta.",
    );
  if (user.role.name !== "CUSTOMER" || user.resetPassword)
    throw new ApplicationError("auth.forbidden", 403, "Se requiere una cuenta de cliente.");
  return { user, token };
}
export function commerceResult<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "Commerce devolvió una respuesta que no se pudo verificar. Actualiza los datos.",
    );
  return result.data;
}
export async function commerceRequest(
  path: string,
  token: string,
  body?: unknown,
  operation: "recharge" | "refund" = "recharge",
): Promise<unknown> {
  const uncertainMessage =
    operation === "refund"
      ? "No se pudo confirmar la devolución. Actualiza la factura y revisa los movimientos antes de volver a enviarla."
      : "No se pudo confirmar la recarga. Revisa tu saldo y movimientos antes de volver a enviarla.";
  const base = (process.env["GATEWAY_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(base + "/api/v1/" + path, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      body === undefined
        ? "No se pudo conectar con Commerce. Inténtalo nuevamente."
        : uncertainMessage,
    );
  }
  if (!response.ok) {
    let detail =
      response.status === 404
        ? path.startsWith("wallets")
          ? "Tu billetera todavía no está disponible. Inténtalo nuevamente."
          : "No se encontró la factura solicitada."
        : response.status === 403
          ? "No tienes acceso a esta información."
          : response.status === 401
            ? "Commerce no pudo validar tu acceso. Inténtalo nuevamente."
            : body === undefined
              ? "No se pudieron consultar tus datos en Commerce."
              : response.status >= 500
                ? uncertainMessage
                : operation === "refund"
                  ? "La devolución no fue aceptada."
                  : "La recarga no fue aceptada.";
    if (response.status === 400 || response.status === 409) {
      try {
        const problem: unknown = await response.json();
        if (
          problem &&
          typeof problem === "object" &&
          "detail" in problem &&
          typeof problem.detail === "string" &&
          problem.detail.trim()
        )
          detail = problem.detail.slice(0, 1000);
      } catch {
        /* Conserva el mensaje general. */
      }
    }
    throw new ApplicationError(
      "system.internal_error",
      response.status === 401 ? 502 : response.status,
      detail,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ApplicationError(
      "system.internal_error",
      502,
      body === undefined ? "No se pudo leer la respuesta de Commerce." : uncertainMessage,
    );
  }
}
export async function getCustomerWallet(access: Awaited<ReturnType<typeof requireCustomerAccess>>) {
  const [wallet, transactions] = await Promise.all([
    commerceRequest("wallets/me", access.token),
    commerceRequest("wallets/me/transactions", access.token),
  ]);
  return {
    wallet: commerceResult(CustomerWalletSchema, wallet),
    transactions: commerceResult(CustomerTransactionsSchema, transactions),
  };
}
export async function getCustomerInvoices(
  access: Awaited<ReturnType<typeof requireCustomerAccess>>,
) {
  const invoices = commerceResult(
    CustomerInvoicesSchema,
    await commerceRequest("payments/me", access.token),
  );
  if (invoices.some((invoice) => invoice.userId !== access.user.id))
    throw new ApplicationError(
      "auth.forbidden",
      403,
      "Las facturas recibidas no corresponden a tu cuenta.",
    );
  return invoices;
}
export async function getCustomerInvoice(
  id: number,
  access: Awaited<ReturnType<typeof requireCustomerAccess>>,
) {
  const invoice = commerceResult(
    CustomerInvoiceSchema,
    await commerceRequest("payments/" + id, access.token),
  );
  if (invoice.id !== id)
    throw new ApplicationError(
      "system.internal_error",
      502,
      "No se pudo verificar la factura solicitada.",
    );
  if (invoice.userId !== access.user.id)
    throw new ApplicationError("auth.forbidden", 403, "La factura no corresponde a tu cuenta.");
  const tickets = commerceResult(
    CustomerTicketSchema.array(),
    await commerceRequest("payments/" + id + "/tickets", access.token),
  );
  if (tickets.some((ticket) => ticket.invoiceId !== id))
    throw new ApplicationError(
      "system.internal_error",
      502,
      "Los tickets recibidos no corresponden a esta factura.",
    );
  return { invoice, tickets };
}
