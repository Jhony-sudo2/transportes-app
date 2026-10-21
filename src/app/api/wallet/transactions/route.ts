import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { activeWallet } from "@/lib/api/active-wallet";
import { unauthorizedResponse, internalErrorResponse } from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await activeWallet.getWalletTransactions(session.token, params));
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
