import { NextRequest, NextResponse } from "next/server";
import { requireCustomerAccess, getCustomerInvoice } from "@/lib/api/commerce";
import { adminErrorResponse } from "@/lib/api/admin";
import { CommerceIdSchema } from "@/lib/validators/customer-commerce";
import { ApplicationError } from "@/types/error";
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireCustomerAccess();
    const id = CommerceIdSchema.safeParse(Number((await context.params).id));
    if (!id.success) throw new ApplicationError("validation.failed", 400, "Factura inválida.");
    return NextResponse.json(await getCustomerInvoice(id.data, access));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
