import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { activeWallet } from "@/lib/api/active-wallet";
import { TopUpSchema } from "@/lib/validators/wallet";
import { unauthorizedResponse, internalErrorResponse } from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  try {
    const body: unknown = await request.json();
    const parsed = TopUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "validation.failed", status: 400, title: "Validation Failed", detail: parsed.error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(await activeWallet.topUpWallet(parsed.data, session.token), { status: 200 });
  } catch (error) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { code: error.code, status: error.status, title: "Error", detail: error.message },
        { status: error.status },
      );
    }
    return internalErrorResponse();
  }
}
