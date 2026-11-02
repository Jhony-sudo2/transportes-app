import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkedBody,
  requireSameOrigin,
  serviceResult,
  transportService,
} from "@/lib/api/transport-service";
import { adminErrorResponse } from "@/lib/api/admin";
import { ApplicationError } from "@/types/error";
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    requireSameOrigin(request);
    const action = checkedBody(z.enum(["confirm", "reject"]), (await context.params).action),
      body = checkedBody(
        z.object({ token: z.string().min(1).max(4096) }).strict(),
        await request.json().catch(() => null),
      ),
      result = serviceResult(
        z.object({ contactEmailStatus: z.enum(["VERIFIED", "REJECTED"]) }),
        await transportService(`invoices/contact-email/${action}`, { body }),
      );
    if (result.contactEmailStatus !== (action === "confirm" ? "VERIFIED" : "REJECTED"))
      throw new ApplicationError(
        "system.internal_error",
        502,
        "No se pudo confirmar el resultado del correo.",
      );
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
