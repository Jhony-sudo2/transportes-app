import "server-only";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { activeWallet } from "@/lib/api/active-wallet";
import { unauthorizedResponse, internalErrorResponse } from "@/lib/api/responses";
import { ApplicationError } from "@/types/error";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (session === null) return unauthorizedResponse();
  try {
    return NextResponse.json(await activeWallet.getWalletBalance(session.token));
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
