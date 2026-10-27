import { NextRequest, NextResponse } from "next/server";
import { requireCustomerAccess, commerceRequest, commerceResult } from "@/lib/api/commerce";
import { adminErrorResponse } from "@/lib/api/admin";
import {
  CustomerRechargeSchema,
  CustomerTransactionSchema,
} from "@/lib/validators/customer-commerce";
import { ApplicationError } from "@/types/error";
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      throw new ApplicationError("auth.forbidden", 403, "Origen no permitido.");
    const access = await requireCustomerAccess();
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ApplicationError("validation.failed", 400, "Solicitud JSON inválida.");
    }
    const parsed = CustomerRechargeSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApplicationError(
        "validation.failed",
        400,
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Guatemala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date())
      .replace(" ", "T");
    const transaction = commerceResult(
      CustomerTransactionSchema,
      await commerceRequest("wallets/me/recharges", access.token, {
        amount: parsed.data.amount,
        rechargeDate: parts,
      }),
    );
    if (
      transaction.transactionType !== "USER_RECHARGE" ||
      transaction.amount !== parsed.data.amount
    )
      throw new ApplicationError(
        "system.internal_error",
        502,
        "La respuesta no confirma la recarga solicitada. Revisa tu saldo y movimientos.",
      );
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
